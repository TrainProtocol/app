import type { BaseHTLCClientConfig } from '@train-protocol/sdk'

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
    sendTransaction(tx: {
        to: string
        data: string
        value?: bigint
        chainId?: number
    }): Promise<string>
}

export type EvmHTLCClientConfig = BaseHTLCClientConfig & {
    /** RPC URL for read operations */
    rpcUrl: string
    /** Optional signer for write operations (createHTLC, refund, claim) */
    signer?: EvmSigner
    /** Optional chain ID for validation */
    chainId?: number
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
