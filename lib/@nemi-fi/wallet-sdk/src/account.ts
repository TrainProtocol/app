import {
  computeAuthWitMessageHash,
  Fr,
  FunctionType,
  type AztecAddress,
  type AztecNode,
  type FunctionAbi,
  type FunctionCall,
  type IntentInnerHash,
  type NodeInfo,
  type SentTx,
} from "@aztec/aztec.js";
import { getCanonicalAuthRegistry } from "@aztec/protocol-contracts/auth-registry/lazy";
import type { ABIParameterVisibility } from "@aztec/stdlib/abi";
import { ContractClassLogFields } from "@aztec/stdlib/logs";
import type { BlockHeader } from "@aztec/stdlib/tx";
import { assert } from "ts-essentials";
import { ContractFunctionInteraction } from "./contract";
import type {
  IntentAction,
  SendOptions,
  SimulateTransactionRequest,
  TransactionRequest,
} from "./exports/index";
import { lazyValue, toAuthWitnessAction } from "./utils";

export abstract class BaseAccount {
  constructor(
    /** The address of the account. */
    readonly address: AztecAddress,
    /** Aztec node to fetch public data */
    readonly aztecNode: AztecNode,
  ) {}

  abstract sendTransaction(
    txRequest: TransactionRequest | Promise<TransactionRequest>,
  ): SentTx;

  abstract simulateTransaction(
    request: SimulateTransactionRequest,
  ): Promise<Fr[][]>;

  async simulatePublicCalls(calls: FunctionCall[]): Promise<Fr[][]> {
    // avoid unnecessary calls to node
    if (calls.length === 0) {
      return [];
    }

    const tx = await createTxFromPublicCalls(await this._nodeInfo(), calls);
    const result = await this.aztecNode.simulatePublicCalls(tx);
    const returnValues = result.publicReturnValues.map((x) => x.values ?? []);
    return returnValues;
  }

  // for compatibility with aztec.js `Wallet`. TODO: Decide whether to keep this or not
  getAddress() {
    return this.address;
  }

  async setPublicAuthWit(
    messageHashOrIntent: Fr | Uint8Array | IntentInnerHash | IntentAction,
    authorized: boolean,
    options?: SendOptions,
  ): Promise<ContractFunctionInteraction> {
    let messageHash: Fr;
    if (messageHashOrIntent instanceof Uint8Array) {
      messageHash = Fr.fromBuffer(Buffer.from(messageHashOrIntent));
    } else if (messageHashOrIntent instanceof Fr) {
      messageHash = messageHashOrIntent;
    } else {
      const chainId = new Fr(await this.aztecNode.getChainId());
      const version = new Fr(await this.aztecNode.getVersion());

      // ugly af but works
      const messageHashOrIntent2 =
        "action" in messageHashOrIntent
          ? {
              ...messageHashOrIntent,
              action: await toAuthWitnessAction(messageHashOrIntent.action),
            }
          : messageHashOrIntent;

      messageHash = await computeAuthWitMessageHash(messageHashOrIntent2, {
        chainId,
        version,
      });
    }

    return new ContractFunctionInteraction(
      await getCanonicalAuthRegistry(),
      this,
      getSetAuthorizedAbi(),
      [messageHash, authorized],
      options,
    );
  }

  private _nodeInfo = lazyValue(async () => {
    const info = await this.aztecNode.getNodeInfo();
    const blockHeader = (await this.aztecNode.getBlockHeader())!;
    return { info, blockHeader };
  });
}

function getSetAuthorizedAbi(): FunctionAbi {
  return {
    name: "set_authorized",
    isInitializer: false,
    functionType: FunctionType.PUBLIC,
    isInternal: true,
    isStatic: false,
    parameters: [
      {
        name: "message_hash",
        type: { kind: "field" },
        visibility: "private" as ABIParameterVisibility,
      },
      {
        name: "authorize",
        type: { kind: "boolean" },
        visibility: "private" as ABIParameterVisibility,
      },
    ],
    returnTypes: [],
    errorTypes: {},
  };
}

async function createTxFromPublicCalls(
  { info, blockHeader }: { info: NodeInfo; blockHeader: BlockHeader },
  calls: FunctionCall[],
) {
  const { Tx, AztecAddress, Fr, HashedValues } = await import(
    "@aztec/aztec.js"
  );
  const { getVKTreeRoot } = await import(
    "@aztec/noir-protocol-circuits-types/vk-tree"
  );
  const { protocolContractTreeRoot } = await import(
    "@aztec/protocol-contracts"
  );
  const { PublicCallRequest } = await import("@aztec/stdlib/kernel");
  const { ClientIvcProof } = await import("@aztec/stdlib/proofs");
  const { ContractClassLog } = await import("@aztec/stdlib/logs");
  const { RollupValidationRequests } = await import("@aztec/stdlib/kernel");
  const { Gas, GasFees, GasSettings } = await import("@aztec/stdlib/gas");
  const { TxConstantData, TxContext } = await import("@aztec/stdlib/tx");
  const { makeTuple } = await import("@aztec/foundation/array");
  const {
    PrivateKernelTailCircuitPublicInputs,
    PartialPrivateTailPublicInputsForPublic,
    PrivateToPublicAccumulatedData,
  } = await import("@aztec/stdlib/kernel");

  const emptyRad = PrivateToPublicAccumulatedData.empty();
  assert(
    calls.length <= emptyRad.publicCallRequests.length,
    `tried to simulate too many public calls: ${calls.length}`,
  );
  const allHashedValues = await Promise.all(
    calls.map(async (call) =>
      HashedValues.fromCalldata([call.selector.toField(), ...call.args]),
    ),
  );
  const publicCallRequests = makeTuple(
    emptyRad.publicCallRequests.length,
    (i) => {
      const call = calls[i];
      if (!call) {
        return PublicCallRequest.empty();
      }
      return new PublicCallRequest(
        AztecAddress.zero(),
        call.to,
        call.isStatic,
        allHashedValues[i]!.hash,
      );
    },
  );
  const revertibleAccumulatedData = new PrivateToPublicAccumulatedData(
    emptyRad.noteHashes,
    emptyRad.nullifiers,
    emptyRad.l2ToL1Msgs,
    emptyRad.privateLogs,
    emptyRad.contractClassLogsHashes,
    publicCallRequests,
  );
  const forPublic = new PartialPrivateTailPublicInputsForPublic(
    PrivateToPublicAccumulatedData.empty(),
    revertibleAccumulatedData,
    PublicCallRequest.empty(),
  );

  const constants = new TxConstantData(
    blockHeader,
    new TxContext(
      info.l1ChainId,
      info.rollupVersion,
      GasSettings.default({
        maxFeesPerGas: GasFees.from({
          feePerDaGas: Fr.MODULUS - 1n,
          feePerL2Gas: Fr.MODULUS - 1n,
        }),
      }),
    ),
    getVKTreeRoot(),
    protocolContractTreeRoot,
  );

  return new Tx(
    new PrivateKernelTailCircuitPublicInputs(
      constants,
      RollupValidationRequests.empty(),
      Gas.empty(),
      AztecAddress.zero(),
      forPublic,
    ),
    ClientIvcProof.empty(),
    [ContractClassLogFields.empty()],
    allHashedValues,
  );
}
