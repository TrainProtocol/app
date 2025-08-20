import type { AztecNode } from "@aztec/aztec.js";
import type { AztecNodeInput } from "./base";
import { chains } from "./chains";
import type {
  ContractFunctionInteraction,
  SimulateTransactionRequest,
  TransactionRequest,
} from "./exports/index";
import type { RpcRequestMap } from "./types";

export const METHODS_NOT_REQUIRING_CONFIRMATION: (keyof RpcRequestMap)[] = [
  "aztec_accounts",
  "aztec_call",
];

export const FINAL_METHODS: readonly (keyof RpcRequestMap)[] = [
  "aztec_requestAccounts",
  "aztec_sendTransaction",
  "wallet_watchAssets",
];

export function lazyValue<T>(fn: () => T) {
  let value: T;
  let initialized = false;
  return () => {
    if (!initialized) {
      initialized = true;
      value = fn();
    }
    return value;
  };
}

export function resolveAztecNode(
  getAztecNode: AztecNodeInput,
): () => Promise<AztecNode> {
  const getAztecNodeFn =
    typeof getAztecNode === "function" ? getAztecNode : () => getAztecNode;
  return lazyValue(async () => {
    const { createAztecNodeClient } = await import("@aztec/aztec.js");
    let aztecNode = getAztecNodeFn();
    if (typeof aztecNode === "string" || aztecNode instanceof URL) {
      aztecNode = createAztecNodeClient(new URL(aztecNode).href);
    }
    return aztecNode;
  });
}

export type ParametersExceptFirst<F> = F extends (
  arg0: any,
  ...rest: infer R
) => any
  ? R
  : never;

export async function request({
  url,
  method,
  body,
}: {
  url: string;
  method: string;
  body?: unknown;
}) {
  const response = await fetch(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText} | ${await response.text()}`,
    );
  }
  return await response.json();
}

export class DefaultMap<K, V> extends Map<K, V> {
  constructor(private readonly defaultValue: () => V) {
    super();
  }

  get(key: K): V {
    let value = super.get(key);
    if (value == null) {
      value = this.defaultValue();
      this.set(key, value);
    }
    return value;
  }
}

export function mergeTransactionRequests(
  requests: TransactionRequest[],
): Required<TransactionRequest> {
  return {
    calls: requests.flatMap((r) => r.calls),
    authWitnesses: requests.flatMap((r) => r.authWitnesses ?? []),
    capsules: requests.flatMap((r) => r.capsules ?? []),
    registerContracts: requests.flatMap((r) => r.registerContracts ?? []),
  };
}

export function mergeSimulateTransactionRequest(
  requests: SimulateTransactionRequest[],
): Required<SimulateTransactionRequest> {
  const txRequest = mergeTransactionRequests(requests);
  return {
    ...txRequest,
    registerSenders: requests.flatMap((r) => r.registerSenders ?? []),
  };
}

export async function toAuthWitnessAction(action: ContractFunctionInteraction) {
  const request = await action.request();
  if (request.calls.length !== 1) {
    throw new Error(
      `Expected exactly 1 call for an auth witness, got ${request.calls.length}`,
    );
  }
  return request.calls[0]!;
}

export async function getAvmChain(aztecNode: AztecNode) {
  const l1ChainId = await aztecNode.getChainId();
  switch (l1ChainId) {
    case 11155111: {
      return chains.testnet;
    }
    case 31337: {
      return chains.sandbox;
    }
    default: {
      throw new Error(`Unsupported L1 chain ID: ${l1ChainId}`);
    }
  }
}
