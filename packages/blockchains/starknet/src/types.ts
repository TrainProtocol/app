import type { AccountInterface, Call } from 'starknet'
import type { StarknetAccountLike } from './login/wallet-sign.js'

/**
 * A built Starknet contract call. Output of the builder methods —
 * a single `Call` for `refund`/`redeemSolver`/`approve`, or an array
 * for `userLock` (when chained with an approve in a multicall).
 */
export type StarknetTransactionRequest = Call

declare module '@train-protocol/sdk' {
    interface HTLCPublicClientConfigMap {
        starknet: StarknetHTLCPublicClientConfig
    }
    interface HTLCWalletClientConfigMap {
        starknet: StarknetHTLCWalletClientConfig
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

export type StarknetHTLCPublicClientConfig = {
    /** RPC URL for read operations */
    rpcUrl: string
}

export type StarknetHTLCWalletClientConfig = StarknetHTLCPublicClientConfig & {
    /** Signer for write operations */
    signer: StarknetSigner
}
