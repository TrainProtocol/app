import {
  decodeFromAbi,
  encodeArguments,
  FunctionSelector,
  PublicKeys,
  type AztecAddress,
  type Contract as AztecContract,
  type DeployMethod as AztecDeployMethod,
  type AztecNode,
  type ContractArtifact,
  type ContractInstanceWithAddress,
  type FunctionCall,
  type Wallet,
} from "@aztec/aztec.js";
import {
  ContractArtifactSchema,
  FunctionType,
  getAllFunctionAbis,
  type FunctionAbi,
} from "@aztec/stdlib/abi";
import type { StrictOmit } from "ts-essentials";
import { DeployMethod, type DeployOptions } from "./contract-deploy";
import type { TransactionRequest } from "./exports/eip1193";
import type { Account, SimulateTransactionRequest } from "./exports/index";
import {
  DefaultMap,
  lazyValue,
  mergeSimulateTransactionRequest,
  mergeTransactionRequests,
  type ParametersExceptFirst,
} from "./utils";

// TODO: consider changing the API to be more viem-like. I.e., use `contract.write.methodName` and `contract.read.methodName`
export class ContractBase<T extends AztecContract> {
  readonly methods: {
    [K in keyof T["methods"]]: ContractMethod<T, K>;
  };

  protected constructor(
    /** Deployed contract instance. */
    readonly instance: ContractInstanceWithAddress,
    /** The Application Binary Interface for the contract. */
    readonly artifact: ContractArtifact,
    /** The account used for interacting with this contract. */
    readonly account: Account,
  ) {
    this.methods = getAllFunctionAbis(artifact).reduce(
      (acc, f) => {
        acc[f.name as keyof T["methods"]] = Object.assign(
          (...argsAndOptions: any[]) => {
            const [args, options = {}] =
              argsAndOptions.length === f.parameters.length
                ? [argsAndOptions, {}]
                : [
                    argsAndOptions.slice(0, -1),
                    argsAndOptions[argsAndOptions.length - 1],
                  ];
            return new ContractFunctionInteraction(
              this, // TODO: is this memory leak?
              this.account,
              f,
              args,
              options,
            );
          },
          {
            async selector() {
              return await FunctionSelector.fromNameAndParameters(
                f.name,
                f.parameters,
              );
            },
          },
        );
        return acc;
      },
      {} as typeof this.methods,
    );
  }

  get address() {
    return this.instance.address;
  }

  /** @deprecated use `withAccount` */
  withWallet = this.withAccount.bind(this);
  withAccount(account: Account): Contract<T> {
    return new Contract<T>(this.instance, this.artifact, account);
  }
}

const cachedContractInstances = /*#__PURE__*/ new DefaultMap<
  AztecNode,
  Map<string, Promise<ContractInstanceWithAddress | undefined>>
>(() => new Map());

// TODO: remove caching?
/**
 * Caches contract instances for a given node to avoid re-fetching the same contract instance. The cache is reset if the user reloads the page.
 * This may be a problem for upgradeable contracts as their "instance" is changed on each upgrade.
 */
export function experimental_getInstanceCached(
  address: AztecAddress,
  node: AztecNode,
) {
  const addressKey = address.toString().toLowerCase();
  const aztecNodeCache = cachedContractInstances.get(node);
  let contractInstancePromise = aztecNodeCache.get(addressKey);
  if (!contractInstancePromise) {
    contractInstancePromise = node.getContract(address);
    aztecNodeCache.set(addressKey, contractInstancePromise);
  }
  return contractInstancePromise;
}

export class Contract<T extends AztecContract> extends ContractBase<T> {
  static async at<T extends AztecContract = AztecContract>(
    address: AztecAddress,
    artifact: ContractArtifact,
    account: Account,
  ) {
    const contractInstance = await experimental_getInstanceCached(
      address,
      account.aztecNode,
    );
    if (contractInstance == null) {
      throw new Error(`Contract at ${address} not found`);
    }

    return new Contract<T>(contractInstance, artifact, account);
  }

  static fromAztec<
    TClass extends AztecContractClass<any>,
    T extends AztecContractInstance<TClass>,
  >(original: TClass) {
    // TODO: remove this when aztec artifacts are deterministic.
    const artifact = ContractArtifactSchema.parse(
      JSON.parse(JSON.stringify(original.artifact)),
    );
    const ContractClass = class extends ContractBase<T> {
      static async at(address: AztecAddress, account: Account) {
        return await Contract.at<T>(address, artifact, account);
      }

      static deploy(
        account: Account,
        ...args: ParametersExceptFirst<TClass["deploy"]>
      ) {
        return new DeployMethod(
          PublicKeys.default(),
          account,
          this.artifact,
          this.at,
          args,
          {},
        );
      }

      static deployWithOpts<M extends keyof T["methods"] & string>(
        options: DeployOptions & {
          account: Account;
          publicKeys?: PublicKeys;
          method?: M;
        },
        ...args: Parameters<T["methods"][M]>
      ) {
        return new DeployMethod(
          options.publicKeys ?? PublicKeys.default(),
          options.account,
          this.artifact,
          this.at,
          args,
          options,
          options.method,
        );
      }

      static artifact: TClass["artifact"] = artifact;
      static events: TClass["events"] = original.events ?? {};
      static notes: TClass["notes"] = original.notes ?? {};
      static storage: TClass["storage"] = original.storage ?? {};
    };
    return ContractClass;
  }
}

export class UnsafeContract<T extends AztecContract> extends Contract<T> {
  constructor(
    instance: ContractInstanceWithAddress,
    artifact: ContractArtifact,
    account: Account,
  ) {
    super(instance, artifact, account);
  }
}

export type ContractInfo = Pick<
  Contract<AztecContract>,
  "address" | "instance" | "artifact"
>;

export class ContractFunctionInteraction {
  readonly #account: Account;
  readonly #functionAbi: FunctionAbi;
  readonly #call: () => Promise<FunctionCall>;
  readonly #txRequest: () => Promise<Required<TransactionRequest>>;

  constructor(
    contract: ContractInfo,
    account: Account,
    functionAbi: FunctionAbi,
    args: unknown[],
    options: SendOptions | undefined,
  ) {
    this.#account = account;
    this.#functionAbi = functionAbi;

    this.#call = lazyValue(async () => {
      return {
        name: this.#functionAbi.name,
        args: encodeArguments(this.#functionAbi, args),
        selector: await FunctionSelector.fromNameAndParameters(
          this.#functionAbi.name,
          this.#functionAbi.parameters,
        ),
        type: this.#functionAbi.functionType,
        to: contract.address,
        isStatic: this.#functionAbi.isStatic,
        returnTypes: this.#functionAbi.returnTypes,
      };
    });
    this.#txRequest = lazyValue(async () => {
      return {
        calls: [await this.#call()],
        authWitnesses: options?.authWitnesses ?? [],
        capsules: options?.capsules ?? [],
        registerContracts: [contract, ...(options?.registerContracts ?? [])],
      };
    });
  }

  send() {
    return this.#account.sendTransaction(this.#txRequest());
  }

  async simulate(
    options: StrictOmit<SimulateTransactionRequest, "calls"> = {},
  ) {
    const txRequest = await this.#txRequest();
    const results =
      this.#functionAbi.functionType === FunctionType.PUBLIC
        ? await this.#account.simulatePublicCalls(txRequest.calls)
        : await this.#account.simulateTransaction(
            mergeSimulateTransactionRequest([
              txRequest,
              { ...options, calls: [] }, // options should not have calls
            ]),
          );

    if (results.length !== 1) {
      throw new Error(`invalid results length: ${results.length}`);
    }
    const result = results[0]!;
    return decodeFromAbi(this.#functionAbi.returnTypes, result);
  }

  async request(): Promise<TransactionRequest> {
    return await this.#txRequest();
  }
}

export class BatchCall
  implements Pick<ReturnType<ContractMethod<any, any>>, "send">
{
  constructor(
    readonly account: Account,
    private readonly calls: (
      | ContractFunctionInteraction
      | FunctionCall
      | TransactionRequest
    )[],
  ) {}

  send() {
    return this.account.sendTransaction(
      Promise.all(
        this.calls.map(async (c) => {
          if ("request" in c) {
            return await c.request();
          }
          if ("selector" in c) {
            return { calls: [c] };
          }
          return c;
        }),
      ).then((requests) => mergeTransactionRequests(requests)),
    );
  }
}

export type IntentAction = {
  caller: AztecAddress;
  action: ContractFunctionInteraction;
};

export type SendOptions = Pick<
  TransactionRequest,
  "authWitnesses" | "capsules" | "registerContracts"
>;

type ContractMethod<T extends AztecContract, K extends keyof T["methods"]> = ((
  ...args: [...Parameters<T["methods"][K]>, options?: SendOptions]
) => ContractFunctionInteraction) & {
  selector(): Promise<FunctionSelector>;
};

type AztecContractClass<T extends AztecContract> = {
  deploy: (deployer: Wallet, ...args: any[]) => AztecDeployMethod<T>;
  artifact: ContractArtifact;
  events?: {};
  notes?: {};
  storage?: {};
};

type AztecContractInstance<C extends AztecContractClass<any>> =
  C extends AztecContractClass<infer T> ? T : never;
