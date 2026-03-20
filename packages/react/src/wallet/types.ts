/** Minimal signer abstraction for chain-agnostic transaction sending */
export interface TrainSigner {
    address: string
    chainNamespace: string // 'eip155', 'solana', 'starknet', 'aztec'
    sendTransaction: (tx: { to: string; data: string; value?: bigint }) => Promise<string>
}

/** Wallet adapter interface — consumers implement this to bridge their wallet library */
export interface TrainWalletAdapter {
    chainNamespace: string
    getSigner: () => TrainSigner | null
    /** Return chain-specific config for createHTLCClient (e.g. { rpcUrl, chainId }) */
    getClientConfig?: () => Record<string, unknown>
    /** Return config for deriveKeyFromWallet() — null means wallet not ready for login */
    getLoginConfig?: () => Record<string, unknown> | null | Promise<Record<string, unknown> | null>
    /** Return a signer targeting a specific network (CAIP-2 ID). Used for cross-chain operations within the same namespace (e.g. EVM→EVM). */
    getSignerForNetwork?: (caip2Id: string) => TrainSigner | null
    /** Return client config for a specific network (CAIP-2 ID). Used for cross-chain operations within the same namespace. */
    getClientConfigForNetwork?: (caip2Id: string) => Record<string, unknown>
}
