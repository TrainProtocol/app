import type { Account } from 'fuels'
import type { FuelWalletLike } from './login/index.js'

declare module '@train-protocol/sdk' {
    interface HTLCClientConfigMap {
        fuel: FuelHTLCClientConfig
    }
}

declare module '@train-protocol/auth' {
    interface WalletSignConfigMap {
        fuel: FuelWalletSignConfig
    }
}

export type FuelWalletSignConfig = {
    wallet: FuelWalletLike
}

/**
 * Minimal signer interface for Fuel write operations.
 * Integrators wrap their Fuel wallet/account into this interface.
 */
export interface FuelSigner {
    /** The signer's Fuel address (B256 format) */
    address: string

    /**
     * The Fuel Account used for executing transactions.
     * Must support creating Contract instances and sending transactions.
     */
    account: Account
}

export type FuelHTLCClientConfig = {
    /** Fuel GraphQL RPC URL for read operations */
    rpcUrl: string
    /** Optional signer for write operations */
    signer?: FuelSigner
}
