import { registerHTLCClient, registerWalletSign } from '@train-protocol/sdk'
import { FuelHTLCClient } from './client.js'
import { deriveKeyFromFuelWallet } from './login/index.js'

let registered = false

/**
 * Explicitly register the Fuel HTLC client and wallet-sign factories.
 * Call once at app startup. Safe to call multiple times (idempotent).
 */
export function registerFuelSdk(): void {
    if (registered) return
    registered = true

    registerHTLCClient('fuel', (config) => new FuelHTLCClient(config))

    registerWalletSign('fuel', async (config) => {
        return deriveKeyFromFuelWallet(config.wallet)
    })
}

export { FuelHTLCClient } from './client.js'
export type { FuelHTLCClientConfig, FuelSigner, FuelWalletSignConfig } from './types.js'
export { deriveKeyFromFuelWallet } from './login/index.js'
export type { FuelWalletLike } from './login/index.js'
