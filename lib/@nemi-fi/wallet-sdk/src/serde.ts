import type {
  AztecAddress,
  Capsule,
  ContractArtifact,
  FunctionCall,
  FunctionSelector,
  PXE,
} from "@aztec/aztec.js";
import type { ContractInstance } from "@aztec/stdlib/contract";
import { Hex } from "ox";
import type { IArtifactStrategy } from "./artifacts";
import type { RegisterContract } from "./exports/eip1193";
import type {
  SerializedCapsule,
  SerializedContractArtifact,
  SerializedContractInstance,
  SerializedFunctionCall,
  SerializedRegisterContract,
} from "./types";
import { request } from "./utils";

export function encodeFunctionCall(call: FunctionCall) {
  return {
    to: call.to.toString(),
    selector: call.selector.toString(),
    args: call.args.map((x) => x.toString()),
  };
}

export async function decodeFunctionCall(pxe: PXE, fc: SerializedFunctionCall) {
  const { AztecAddress, FunctionSelector, Fr } = await import(
    "@aztec/aztec.js"
  );

  const to = AztecAddress.fromString(fc.to);
  const selector = FunctionSelector.fromString(fc.selector);
  const args = fc.args.map((x) => Fr.fromHexString(x));

  const artifact = await getContractFunctionAbiFromPxe(pxe, to, selector);

  const call: FunctionCall = {
    to,
    selector,
    args,
    name: artifact.name,
    type: artifact.functionType,
    isStatic: artifact.isStatic,
    returnTypes: artifact.returnTypes,
  };
  return call;
}

export function encodeCapsules(capsules: Capsule[]): SerializedCapsule[] {
  return capsules.map((c) => ({
    contract: c.contractAddress.toString(),
    storageSlot: c.storageSlot.toString(),
    data: c.data.map((x) => x.toString()),
  }));
}

export async function decodeCapsules(
  capsules: SerializedCapsule[],
): Promise<Capsule[]> {
  const { Capsule, Fr, AztecAddress } = await import("@aztec/aztec.js");
  return capsules.map(
    (capsule) =>
      new Capsule(
        AztecAddress.fromString(capsule.contract),
        Fr.fromString(capsule.storageSlot),
        capsule.data.map((x) => Fr.fromString(x)),
      ),
  );
}

export async function getContractFunctionAbiFromPxe(
  pxe: PXE,
  address: AztecAddress,
  selector: FunctionSelector,
) {
  const { FunctionSelector, getAllFunctionAbis } = await import(
    "@aztec/aztec.js"
  );

  const instance = await pxe.getContractMetadata(address);
  if (!instance.contractInstance) {
    // TODO(security): can leak privacy by fingerprinting what contracts are added to user's PXE
    throw new Error(`no contract instance found for ${address}`);
  }
  const contractArtifact = await pxe.getContractClassMetadata(
    instance.contractInstance.currentContractClassId,
    true,
  );
  if (!contractArtifact.artifact) {
    // TODO(security): can leak privacy by fingerprinting what contracts are added to user's PXE
    throw new Error(`no contract artifact found for ${address}`);
  }
  const artifact = (
    await Promise.all(
      getAllFunctionAbis(contractArtifact.artifact).map(async (f) => {
        const s = await FunctionSelector.fromNameAndParameters(
          f.name,
          f.parameters,
        );
        return s.equals(selector) ? f : undefined;
      }),
    )
  ).find((f) => f != null);
  if (!artifact) {
    // TODO(security): can leak privacy by fingerprinting what contracts are added to user's PXE
    throw new Error(`no function artifact found for ${address}`);
  }
  return artifact;
}

// TODO: this function must be sync in order for browser popups to work. `serializeArtifact` takes too much time and browser blocks the popup because the time difference between user clicking the button and the window.open call is too big.
export async function encodeRegisterContracts({
  contracts,
  artifactStrategy,
}: {
  contracts: RegisterContract[];
  artifactStrategy: IArtifactStrategy;
}) {
  return await Promise.all(
    contracts.map(async (x) => ({
      address: x.address.toString(),
      instance: x.instance ? encodeContractInstance(x.instance) : undefined,
      artifact: x.artifact
        ? await artifactStrategy.serializeArtifact(x.artifact)
        : undefined,
    })),
  );
}

export async function decodeRegisterContract(data: SerializedRegisterContract) {
  const { AztecAddress } = await import("@aztec/aztec.js");
  return {
    address: AztecAddress.fromString(data.address),
    instance: data.instance
      ? await decodeContractInstance(data.instance)
      : undefined,
    artifact: data.artifact
      ? await decodeContractArtifact(data.artifact)
      : undefined,
  };
}

export async function decodeRegisterContracts(
  data: SerializedRegisterContract[],
) {
  return await Promise.all(data.map(decodeRegisterContract));
}

function encodeContractInstance(
  instance: ContractInstance,
): SerializedContractInstance {
  return {
    version: Hex.fromNumber(instance.version),
    salt: instance.salt.toString(),
    deployer: instance.deployer.toString(),
    originalContractClassId: instance.originalContractClassId.toString(),
    currentContractClassId: instance.currentContractClassId.toString(),
    initializationHash: instance.initializationHash.toString(),
    publicKeys: instance.publicKeys.toString(),
  };
}

export async function decodeContractInstance(
  data: SerializedContractInstance,
): Promise<ContractInstance> {
  const { AztecAddress, Fr, PublicKeys } = await import("@aztec/aztec.js");
  return {
    version: Hex.toNumber(
      data.version satisfies string as Hex.Hex,
    ) as ContractInstance["version"],
    salt: Fr.fromString(data.salt),
    deployer: AztecAddress.fromString(data.deployer),
    originalContractClassId: Fr.fromString(data.originalContractClassId),
    currentContractClassId: Fr.fromString(data.currentContractClassId),
    initializationHash: Fr.fromString(data.initializationHash),
    publicKeys: PublicKeys.fromString(data.publicKeys),
  };
}

const cachedArtifactDownloads = new Map<string, Promise<ContractArtifact>>();
export async function decodeContractArtifact(
  data: SerializedContractArtifact,
): Promise<ContractArtifact> {
  if (data.type === "url") {
    let artifactPromise = cachedArtifactDownloads.get(data.url);
    if (!artifactPromise) {
      // TODO: support IPFS
      artifactPromise = request({ method: "GET", url: data.url });
      cachedArtifactDownloads.set(data.url, artifactPromise);
    }
    const artifact = await artifactPromise;
    data = {
      type: "literal",
      literal: artifact,
    };
  }

  const { ContractArtifactSchema } = await import("@aztec/stdlib/abi");
  return ContractArtifactSchema.parse(data.literal);
}
