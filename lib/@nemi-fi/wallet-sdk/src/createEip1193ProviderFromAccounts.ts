import {
  AztecAddress,
  encodeArguments,
  FeeJuicePaymentMethod,
  Fr,
  SentTx,
  type AztecNode,
  type FeePaymentMethod,
  type FunctionCall,
  type PXE,
  type Wallet,
} from "@aztec/aztec.js";
import { ExecutionPayload } from "@aztec/entrypoints/payload";
import {
  decodeFromAbi,
  FunctionType,
  type ABIParameter,
  type FunctionAbi,
} from "@aztec/stdlib/abi";
import { Gas, GasFees, GasSettings } from "@aztec/stdlib/gas";
import type { TxSimulationResult } from "@aztec/stdlib/tx";
import { Hex } from "ox";
import { assert } from "ts-essentials";
import type { AvmChain } from "./chains";
import {
  decodeCapsules,
  decodeFunctionCall,
  decodeRegisterContract,
  getContractFunctionAbiFromPxe,
} from "./serde";
import type {
  RpcRequestMap,
  SerializedRegisterContract,
  TypedEip1193Provider,
} from "./types";

export function createEip1193ProviderFromAccounts(
  aztecNode: AztecNode,
  pxe: PXE,
  accounts: Wallet[],
  avmChain: AvmChain,
  paymentMethod?: FeePaymentMethod,
) {
  function getAccount(params: { from: string; chainId: string }) {
    const account = accounts.find(
      (a) => a.getAddress().toString() === params.from,
    );
    assert(account, `no account found for ${params.from}`);
    const avmChainId = Hex.toNumber(params.chainId as `0x${string}`);
    assert(
      avmChainId === avmChain.id,
      `chainId mismatch: ${avmChainId} !== ${avmChain.id}`,
    );
    return account;
  }
  const provider: TypedEip1193Provider = {
    async request(params) {
      params = JSON.parse(JSON.stringify(params)); // ensure (de)serialization works

      const methodMap: {
        [K in keyof RpcRequestMap]: (
          ...args: Parameters<RpcRequestMap[K]>
        ) => Promise<ReturnType<RpcRequestMap[K]>>;
      } = {
        aztec_sendTransaction: async (request) => {
          const account = getAccount(request);

          // register contracts
          await registerContracts(
            aztecNode,
            pxe,
            request.registerContracts ?? [],
          );

          // decode calls
          const calls = await Promise.all(
            request.calls.map((x) => decodeFunctionCall(pxe, x)),
          );

          // approve auth witnesses
          const authWitRequests = await Promise.all(
            request.authWitnesses.map(async (authWitness) => ({
              caller: AztecAddress.fromString(authWitness.caller),
              action: await decodeFunctionCall(pxe, authWitness.action),
            })),
          );
          const authWitnesses = await Promise.all(
            authWitRequests.map((authWitRequest) =>
              account.createAuthWit(authWitRequest),
            ),
          );

          const payload = new ExecutionPayload(
            calls,
            authWitnesses,
            await decodeCapsules(request.capsules ?? []),
          );

          // sign the tx
          const txRequest = await account.createTxExecutionRequest(
            payload,
            await getDefaultFee(account, paymentMethod),
            {},
          );
          const simulatedTx = await account.simulateTx(txRequest, true);
          const tx = await account.proveTx(
            txRequest,
            simulatedTx.privateExecutionResult,
          );
          const txHash = await new SentTx(
            account,
            () => account.sendTx(tx.toTx()),
          ).getTxHash();
          return txHash.toString();
        },
        aztec_call: async (request) => {
          const account = getAccount(request);

          // register contracts
          await registerContracts(
            aztecNode,
            pxe,
            request.registerContracts ?? [],
          );

          await registerSenders(pxe, request.registerSenders ?? []);

          const deserializedCalls = await Promise.all(
            request.calls.map((x) => decodeFunctionCall(pxe, x)),
          );
          const { indexedCalls, unconstrained } = deserializedCalls.reduce<{
            /** Keep track of the number of private calls to retrieve the return values */
            privateIndex: 0;
            /** Keep track of the number of public calls to retrieve the return values */
            publicIndex: 0;
            /** The public and private function calls in the batch */
            indexedCalls: [FunctionCall, number, number][];
            /** The unconstrained function calls in the batch. */
            unconstrained: [FunctionCall, number][];
          }>(
            (acc, current, index) => {
              if (current.type === FunctionType.UTILITY) {
                acc.unconstrained.push([current, index]);
              } else {
                acc.indexedCalls.push([
                  current,
                  index,
                  current.type === FunctionType.PRIVATE
                    ? acc.privateIndex++
                    : acc.publicIndex++,
                ]);
              }
              return acc;
            },
            {
              indexedCalls: [],
              unconstrained: [],
              publicIndex: 0,
              privateIndex: 0,
            },
          );

          const unconstrainedCalls = unconstrained.map(
            async ([call, index]) => {
              const result = await simulateUtilityEncoded(pxe, account, call);
              return [result, index] as const;
            },
          );

          let simulatedTxPromise: Promise<TxSimulationResult> | undefined;
          if (indexedCalls.length !== 0) {
            const payload = new ExecutionPayload(
              indexedCalls.map(([call]) => call),
              [],
              [],
            );
            const txRequest = await account.createTxExecutionRequest(
              payload,
              await getDefaultFee(account, paymentMethod),
              {},
            );
            simulatedTxPromise = account.simulateTx(
              txRequest,
              true, // simulatePublic
              undefined, // TODO: use account.getAddress() when fixed https://github.com/AztecProtocol/aztec-packages/issues/11278
              false,
            );
          }

          const [unconstrainedResults, simulatedTx] = await Promise.all([
            Promise.all(unconstrainedCalls),
            simulatedTxPromise,
          ]);

          const results: Fr[][] = [];

          for (const [result, index] of unconstrainedResults) {
            results[index] = result;
          }
          if (simulatedTx) {
            for (const [call, callIndex, resultIndex] of indexedCalls) {
              // As account entrypoints are private, for private functions we retrieve the return values from the first nested call
              // since we're interested in the first set of values AFTER the account entrypoint
              // For public functions we retrieve the first values directly from the public output.
              const rawReturnValues =
                call.type == FunctionType.PRIVATE
                  ? simulatedTx.getPrivateReturnValues()?.nested?.[
                    resultIndex + 1 // +1 to skip the account entrypoint
                  ]?.values
                  : simulatedTx.getPublicReturnValues()[resultIndex]?.values;
              results[callIndex] = rawReturnValues ?? [];
            }
          }
          return results.map((result) => result.map((x) => x.toString()));
        },
        aztec_requestAccounts: async () => {
          return accounts.map((a) => a.getAddress().toString());
        },
        aztec_accounts: async () => {
          return accounts.map((a) => a.getAddress().toString());
        },
        wallet_watchAssets: async () => { },
      };

      let result = await methodMap[params.method](...params.params);
      result = JSON.parse(JSON.stringify(result)); // ensure (de)serialization works
      return result;
    },
  };

  return provider;
}

const gasSettings = GasSettings.from({
  gasLimits: Gas.random(),
  maxFeesPerGas: GasFees.random(),
  maxPriorityFeesPerGas: GasFees.random(),
  teardownGasLimits: Gas.random()
});

async function getDefaultFee(
  account: Wallet,
  paymentMethod: FeePaymentMethod | undefined,
) {
  paymentMethod ??= new FeeJuicePaymentMethod(account.getAddress());
  return {
    gasSettings: gasSettings,
    paymentMethod,
  };
}

registerContracts.wasRegistered = new Set<string>();
async function registerContracts(
  aztecNode: AztecNode,
  pxe: PXE,
  serialized: SerializedRegisterContract[],
) {
  await Promise.all(
    serialized.map(async (data) => {
      const registeringKey = data.address.toLowerCase();
      // deduplicate registration requests
      if (registerContracts.wasRegistered.has(registeringKey)) {
        return;
      }

      const c = await decodeRegisterContract(data);
      const instance = c.instance ?? (await aztecNode.getContract(c.address));
      if (!instance) {
        // fails the whole RPC call if instance not found
        throw new Error(`no contract instance found for ${c.address}`);
      }

      const artifact =
        c.artifact ??
        // TODO: try to fetch artifact from aztecscan or a similar service
        (
          await pxe.getContractClassMetadata(
            instance.currentContractClassId,
            true,
          )
        ).artifact;
      if (!artifact) {
        // fails the whole RPC call if artifact not found
        throw new Error(`no contract artifact found for ${c.address}`);
      }

      const contract = {
        instance: {
          ...instance,
          address: c.address,
        },
        artifact,
      };

      if (typeof process !== "undefined" && process.env.CI) {
        // TODO: fails CI without this line. More info: https://discord.com/channels/1144692727120937080/1365069273281724486
        await aztecNode.getNodeInfo();
      }
      try {
        await pxe.registerContract(contract);
        registerContracts.wasRegistered.add(registeringKey);
      } catch (e) {
        console.error(
          "error registering contract",
          c.artifact?.name,
          c.address.toString(),
          e,
        );
        throw e;
      }
    }),
  );
}

async function simulateUtilityEncoded(
  pxe: PXE,
  account: Wallet,
  call: FunctionCall,
) {
  // TODO: remove encoding logic when fixed https://github.com/AztecProtocol/aztec-packages/issues/11275
  const fnAbi = await getContractFunctionAbiFromPxe(
    pxe,
    call.to,
    call.selector,
  );
  let argsIndex = 0;
  const decodedArgs = fnAbi.parameters.map((fnAbiParam) => {
    let currentArgs: Fr[] = [];
    if (fnAbiParam.type.kind === "array") {
      currentArgs = call.args.slice(
        argsIndex,
        argsIndex + fnAbiParam.type.length,
      );

      argsIndex += fnAbiParam.type.length;
    } else {
      currentArgs = [call.args[argsIndex]!];
      argsIndex++;
    }
    return decodeFromAbi([fnAbiParam.type], currentArgs);
  });
  assert(
    argsIndex === call.args.length,
    `argsIndex & length mismatch: ${argsIndex} !== ${call.args.length}`,
  );
  const { result: decodedResult } = await account.simulateUtility(
    call.name,
    decodedArgs,
    call.to,
    undefined,
    account.getAddress(),
  );

  const firstReturnType = call.returnTypes[0];
  const isTuple = firstReturnType?.kind === "tuple";
  if (isTuple) {
    call.returnTypes = firstReturnType.fields;
  }
  const paramsAbi: ABIParameter[] = call.returnTypes.map((type, i) => ({
    type,
    name: `result${i}`,
    visibility: "public",
  }));
  const result = encodeArguments(
    { parameters: paramsAbi } as FunctionAbi,
    isTuple || firstReturnType?.kind === "array"
      ? [decodedResult]
      : Array.isArray(decodedResult)
        ? decodedResult
        : [decodedResult],
  );
  return result;
}

async function registerSenders(pxe: PXE, senders: string[]) {
  await Promise.all(
    senders.map(
      async (sender) =>
        await pxe.registerSender(AztecAddress.fromString(sender)),
    ),
  );
}
