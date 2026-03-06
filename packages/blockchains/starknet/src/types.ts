import type { Account } from 'starknet'
import type { BaseHTLCClientConfig } from '@train-protocol/sdk'
import type { StarknetAccountLike } from './login/wallet-sign.js'

declare module '@train-protocol/sdk' {
    interface HTLCClientConfigMap {
        starknet: StarknetHTLCClientConfig
    }
    interface WalletSignConfigMap {
        starknet: StarknetWalletSignConfig
    }
}

export type StarknetWalletSignConfig = {
    provider: StarknetAccountLike
    address: string
    options?: { chainId?: string }
}

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
