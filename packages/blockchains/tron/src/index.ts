import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { TronHTLCPublicClient, TronHTLCWalletClient } from './client/index.js'
import { deriveKeyFromTronWallet } from './login/index.js'

/**
 * Explicitly register the Tron HTLC client and wallet-sign factories.
 * Call once at app startup. Accepts optional SDK/Auth instances for testing isolation.
 */
export function registerTronSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCPublicClient('tron', (config) => new TronHTLCPublicClient(config))
    s.registerHTLCWalletClient('tron', (config) => new TronHTLCWalletClient(config))

    a.registerWalletSign('tron', async (config) => {
        return deriveKeyFromTronWallet(config.wallet)
    })
}

export { TronHTLCPublicClient, TronHTLCWalletClient } from './client/index.js'
export type { TronHTLCPublicClientConfig, TronHTLCWalletClientConfig, TronSigner, TronUnsignedTransaction, TronWalletSignConfig } from './types.js'
export { deriveKeyFromTronWallet } from './login/index.js'
export type { TronWalletLike } from './login/index.js'
