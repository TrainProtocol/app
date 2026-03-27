import type { AccountInterface } from 'starknet'
import type { StarknetAccountLike } from './login/wallet-sign.js'

declare module '@train-protocol/sdk' {
    interface HTLCClientConfigMap {
        starknet: StarknetHTLCClientConfig
    }
}

declare module '@train-protocol/auth' {
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
    account: AccountInterface
}

export type StarknetHTLCClientConfig = {
    /** RPC URL for read operations */
    rpcUrl: string
    /** Optional signer for write operations */
    signer?: StarknetSigner
}
