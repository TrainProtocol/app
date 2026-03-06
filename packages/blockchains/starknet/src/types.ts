import type { Account } from 'starknet'
import type { BaseHTLCClientConfig } from '@train-protocol/sdk'

/**
 * Minimal signer interface for Starknet write operations.
 * Integrators wrap their starknet.js Account/WalletAccount into this interface.
 */
export interface StarknetSigner {
    /** The signer's Starknet address */
    address: string

    /**
     * The starknet.js Account (or compatible) used for executing transactions.
     * Must support `execute(calls)` and `waitForTransaction(hash)`.
     */
    account: Account
}

export type StarknetHTLCClientConfig = BaseHTLCClientConfig & {
    /** RPC URL for read operations */
    rpcUrl: string
    /** Optional signer for write operations */
    signer?: StarknetSigner
}
