import type { BaseAccount } from "./account";

export type RpcRequestMap = {
  /**
   * Requests the user to connect 1 or more accounts to the app. Should trigger a confirmation popup/modal.
   * @returns `AztecAddress[]` of the connected accounts. The first one must be the currently selected account.
   */
  aztec_requestAccounts: () => string[];

  /**
   * Must **NOT** trigger a confirmation popup/modal.
   * @returns `AztecAddress[]` of the previously connected accounts. The first one must be the currently selected account.
   */
  aztec_accounts: () => string[];

  /**
   * Sends a transaction to the blockchain from `request.from` account.
   * @returns the transaction hash
   */
  aztec_sendTransaction: (request: {
    /** `number` hex string */
    chainId: string;
    /** `AztecAddress` of the account that will send the transaction */
    from: string;
    /** `FunctionCall[]` to be executed in the transaction */
    calls: SerializedFunctionCall[];
    /** Authentication witnesses required for the transaction */
    authWitnesses: SerializedAuthWitness[];
    /** `Capsule[]` a list of capsules required for the transaction */
    capsules?: SerializedCapsule[];
    /** Contracts required to send the transaction */
    registerContracts?: SerializedRegisterContract[];
  }) => string;

  // TODO: add aztec_estimateGas

  /**
   * Reads blockchain state.
   * @returns an array of return values (each being `Fr[]`) of the calls
   */
  aztec_call: (request: {
    /** `number` hex string */
    chainId: string;
    /** `AztecAddress` of the account that will the call will be simulated from */
    from: string;
    /** `FunctionCall[]` to be simulated */
    calls: SerializedFunctionCall[];
    /** Contracts required for this call to be simulated */
    registerContracts?: SerializedRegisterContract[];
    /** `AztecAddress[]` of the senders to register */
    registerSenders?: string[];
  }) => string[][];

  /**
   * Requests the user to add an asset to the wallet. Must trigger a confirmation popup.
   */
  wallet_watchAssets: (request: {
    assets: {
      // TODO: is this type namespaced enough? Could this clash with other chains which names start with "A"? E.g., Aleo also has an "ARC20" standard
      type: "ARC20";
      options: {
        /** `number` hex string */
        chainId: string;
        address: string;
        decimals: number;
        symbol: string;
        name: string;
        image: string;
      };
    }[];
  }) => void;
};

export type RpcRequest<M extends keyof RpcRequestMap> = {
  method: M;
  params: Parameters<RpcRequestMap[M]>;
};

export type RpcEventsMap = {
  /**
   * Emitted when the user changes the selected account in wallet UI. It is the `AztecAddress` of the new selected account.
   */
  accountsChanged: [string];
};

export type SerializedFunctionCall = {
  /** `AztecAddress` of the contract */
  to: string;
  // TODO: replace selector and args with encoded `data` similar to Ethereum?
  /** `FunctionSelector` of the contract method */
  selector: string;
  /** `Fr[]` */
  args: string[];
};

export type SerializedAuthWitness = {
  /** `AztecAddress` */
  caller: string;
  /** `FunctionCall` */
  // TODO: rename to `call`?
  action: SerializedFunctionCall;
};

export type SerializedCapsule = {
  /** `AztecAddress` of the contract */
  contract: string;
  /** `Fr` */
  storageSlot: string;
  /** `Fr[]` */
  data: string[];
};

export type SerializedRegisterContract = {
  /** `AztecAddress` of the contract to register */
  address: string;
  /** Contract instance to register */
  instance?: SerializedContractInstance;
  /** Contract artifact to register. Can be omitted if the artifact is already in user's PXE. */
  artifact?: SerializedContractArtifact;
};

export type SerializedContractInstance = {
  /** `bigint` hex string */
  version: string;
  /** `Fr` */
  salt: string;
  /** `AztecAddress` */
  deployer: string;
  /** `Fr` */
  originalContractClassId: string;
  /** `Fr` */
  currentContractClassId: string;
  /** `Fr` */
  initializationHash: string;
  /** `PublicKeys` */
  publicKeys: string;
};

export type SerializedContractArtifact =
  | {
      type: "url";
      url: string;
    }
  | {
      type: "literal";
      literal: object;
    };

export interface Eip1193Provider {
  request(request: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<unknown>;
}

export interface TypedEip1193Provider {
  request<M extends keyof RpcRequestMap>(
    request: RpcRequest<M>,
  ): Promise<ReturnType<RpcRequestMap[M]>>;
}

export interface Account
  extends Pick<
    BaseAccount,
    | "address"
    | "getAddress"
    | "aztecNode"
    | "sendTransaction"
    | "simulateTransaction"
    | "simulatePublicCalls"
    | "setPublicAuthWit"
  > {}

/**
 * @deprecated use {@link Account} instead
 * @example
 * ```ts
 * import { type Account } from "@nemi-fi/wallet-sdk";
 * ```
 */
export type Wallet = Account;
