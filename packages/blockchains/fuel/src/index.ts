import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { FuelHTLCClient } from './client.js'
import { deriveKeyFromFuelWallet } from './login/index.js'

/**
 * Explicitly register the Fuel HTLC client and wallet-sign factories.
 * Call once at app startup. Accepts optional SDK/Auth instances for testing isolation.
 */
export function registerFuelSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCClient('fuel', (config) => new FuelHTLCClient(config))

    a.registerWalletSign('fuel', async (config) => {
        return deriveKeyFromFuelWallet(config.wallet)
    })
}

export { FuelHTLCClient } from './client.js'
export type { FuelHTLCClientConfig, FuelSigner, FuelWalletSignConfig } from './types.js'
export { deriveKeyFromFuelWallet } from './login/index.js'
export type { FuelWalletLike } from './login/index.js'
