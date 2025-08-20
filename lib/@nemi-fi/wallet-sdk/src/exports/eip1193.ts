import {
  AztecAddress,
  Fr,
  SentTx,
  TxHash,
  type AztecNode,
  type Capsule,
  type ContractArtifact,
  type FeePaymentMethod,
  type FunctionCall,
  type PXE,
  type Wallet,
} from "@aztec/aztec.js";
import type { ContractInstance } from "@aztec/stdlib/contract";
import { Hex } from "ox";
import { BaseAccount } from "../account";
import {
  LiteralArtifactStrategy,
  type IArtifactStrategy,
} from "../artifacts";
import type { AvmChain } from "../chains";
import type { Contract, IntentAction } from "../contract";
import { createEip1193ProviderFromAccounts } from "../createEip1193ProviderFromAccounts";
import {
  encodeCapsules,
  encodeFunctionCall,
  encodeRegisterContracts,
} from "../serde";
import type { Eip1193Provider, TypedEip1193Provider } from "../types";
import { getAvmChain, toAuthWitnessAction } from "../utils";

export { BatchCall, Contract } from "../contract";

export class Eip1193Account extends BaseAccount {
  /** The RPC provider to send requests to the wallet. */
  readonly provider: TypedEip1193Provider;

  constructor(
    address: AztecAddress,
    provider: Eip1193Provider,
    aztecNode: AztecNode,
    private readonly artifactStrategy: IArtifactStrategy,
    private readonly avmChain: AvmChain,
  ) {
    super(address, aztecNode);
    this.provider = provider as TypedEip1193Provider;
  }

  // TODO: return a promise that resolves to `SentTxWithHash`
  sendTransaction(
    txRequest: TransactionRequest | Promise<TransactionRequest>,
  ): SentTx {
    const txHashPromise = (async () => {
      const txRequest_ = await txRequest;
      return this.provider.request({
        method: "aztec_sendTransaction",
        params: [
          {
            chainId: Hex.fromNumber(this.avmChain.id),
            from: this.address.toString(),
            calls: txRequest_.calls.map(encodeFunctionCall),
            authWitnesses: await Promise.all(
              (txRequest_?.authWitnesses ?? []).map(async (x) => ({
                caller: x.caller.toString(),
                action: encodeFunctionCall(await toAuthWitnessAction(x.action)),
              })),
            ),
            capsules: encodeCapsules(txRequest_?.capsules ?? []),
            registerContracts: await encodeRegisterContracts({
              contracts: txRequest_?.registerContracts ?? [],
              artifactStrategy: this.artifactStrategy,
            }),
          },
        ],
      });
    })().then((x) => TxHash.fromString(x));

    return new SentTx(this.aztecNode, () => txHashPromise);
  }

  // TODO: rename to either `call` or `view` or `readContract` or something more descriptive
  async simulateTransaction(
    txRequest: SimulateTransactionRequest,
  ): Promise<Fr[][]> {
    // avoid unnecessary calls
    if (txRequest.calls.length === 0) {
      return [];
    }

    const results = await this.provider.request({
      method: "aztec_call",
      params: [
        {
          chainId: Hex.fromNumber(this.avmChain.id),
          from: this.address.toString(),
          calls: txRequest.calls.map((x) => encodeFunctionCall(x)),
          registerContracts: await encodeRegisterContracts({
            contracts: txRequest.registerContracts ?? [],
            artifactStrategy: this.artifactStrategy,
          }),
          registerSenders: txRequest.registerSenders?.map((x) => x.toString()),
        },
      ],
    });

    return results.map((result) => result.map((x) => new Fr(BigInt(x))));
  }

  /**
   * @deprecated only use to convert aztec account to `Eip1193Account` for compatibility reasons
   */
  static async fromAztec(
    account: Wallet,
    aztecNode: AztecNode,
    pxe: PXE,
    paymentMethod?: FeePaymentMethod,
  ): Promise<Eip1193Account> {
    const avmChain = await getAvmChain(aztecNode);
    const provider = createEip1193ProviderFromAccounts(
      aztecNode,
      pxe,
      [account],
      avmChain,
      paymentMethod,
    );
    const artifactStrategy = new LiteralArtifactStrategy();
    return new this(
      account.getAddress(),
      provider,
      aztecNode,
      artifactStrategy,
      avmChain,
    );
  }
}

export type TransactionRequest = {
  calls: FunctionCall[];
  authWitnesses?: IntentAction[];
  capsules?: Capsule[];
  registerContracts?: RegisterContract[];
};

export type SimulateTransactionRequest = Pick<
  TransactionRequest,
  "calls" | "registerContracts"
> & {
  registerSenders?: AztecAddress[];
};

export type RegisterContract =
  // for easy API
  | Contract<any>
  // provide optional instance and artifact (if not provided, fetch from node or artifact store)
  | {
    address: AztecAddress;
    instance?: ContractInstance;
    artifact?: ContractArtifact;
  };
