import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { TonHTLCClient } from './client.js'
import { deriveKeyFromTonWallet } from './login/index.js'

/**
 * Explicitly register the TON HTLC client and wallet-sign factories.
 * Call once at app startup. Accepts optional SDK/Auth instances for testing isolation.
 */
export function registerTonSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCClient('ton', (config) => new TonHTLCClient(config))

    a.registerWalletSign('ton', async (config) => {
        return deriveKeyFromTonWallet(config.wallet)
    })
}

export { TonHTLCClient } from './client.js'
export type { TonHTLCClientConfig, TonSigner, TonWalletSignConfig } from './types.js'
export { deriveKeyFromTonWallet } from './login/index.js'
export type { TonWalletLike } from './login/index.js'
