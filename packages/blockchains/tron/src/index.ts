import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { TronHTLCClient } from './client.js'
import { deriveKeyFromTronWallet } from './login/index.js'

/**
 * Explicitly register the Tron HTLC client and wallet-sign factories.
 * Call once at app startup. Accepts optional SDK/Auth instances for testing isolation.
 */
export function registerTronSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCClient('tron', (config) => new TronHTLCClient(config))

    a.registerWalletSign('tron', async (config) => {
        return deriveKeyFromTronWallet(config.wallet)
    })
}

export { TronHTLCClient } from './client.js'
export type { TronHTLCClientConfig, TronSigner, TronUnsignedTransaction, TronWalletSignConfig } from './types.js'
export { deriveKeyFromTronWallet } from './login/index.js'
export type { TronWalletLike } from './login/index.js'
