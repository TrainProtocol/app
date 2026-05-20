import type { Eip1193Provider } from './login/wallet-sign.js'

declare module '@train-protocol/sdk' {
    interface HTLCPublicClientConfigMap {
        eip155: EvmHTLCPublicClientConfig
    }
    interface HTLCWalletClientConfigMap {
        eip155: EvmHTLCWalletClientConfig
    }
    interface HTLCTransactionRequestMap {
        eip155: EvmTransactionRequest
    }
}

declare module '@train-protocol/auth' {
    interface WalletSignConfigMap {
        eip155: EvmWalletSignConfig
    }
}

export type EvmWalletSignConfig = {
    provider: Eip1193Provider
    address: `0x${string}`
    options?: { sandbox?: boolean; currentChainId?: number }
}

/**
 * A built, unsigned EVM transaction request. Output of the builder methods
 * (`buildUserLockTx`, `buildRefundTx`, `buildRedeemSolverTx`, `buildApproveTx`)
 * and input shape accepted by `EvmSigner.sendTransaction`.
 */
export interface EvmTransactionRequest {
    to: string
    data: string
    value?: bigint
    chainId?: number
}

/**
 * Minimal signer interface for EVM write operations.
 * Integrators wrap their library's signer (viem WalletClient, ethers Signer,
 * raw EIP-1193 provider) into this interface.
 */
export interface EvmSigner {
    /** The signer's address (checksummed or lowercase) */
    address: string

    /**
     * Sign and broadcast a transaction, returning the tx hash.
     * The SDK builds all calldata; the signer only needs to sign and send.
     */
    sendTransaction(tx: EvmTransactionRequest): Promise<string>
}

export type EvmHTLCPublicClientConfig = {
    /** RPC URL for read operations */
    rpcUrl: string
    /** Optional chain ID for validation */
    chainId?: number
}

export type EvmHTLCWalletClientConfig = EvmHTLCPublicClientConfig & {
    /** Signer for write operations (userLock, refund, redeemSolver) */
    signer: EvmSigner
}

/** Raw JSON-RPC transaction receipt */
export interface RpcTransactionReceipt {
    transactionHash: string
    blockNumber: string
    status: string
    logs: RpcLog[]
}

export interface RpcLog {
    address: string
    topics: string[]
    data: string
    logIndex: string
    blockNumber: string
    transactionHash: string
}

/** Raw JSON-RPC transaction */
export interface RpcTransaction {
    from: string
    to: string | null
    hash: string
    input: string
    value: string
    blockNumber: string
}

/** Raw JSON-RPC block */
export interface RpcBlock {
    number: string
    timestamp: string
}
