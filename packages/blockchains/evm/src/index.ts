import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { EvmHTLCPublicClient, EvmHTLCWalletClient } from './client/index.js'
import { deriveKeyFromEvmSignature } from './login/index.js'

/**
 * Explicitly register the EVM HTLC client and wallet-sign factories.
 * Call once at app startup. Accepts optional SDK/Auth instances for testing isolation.
 */
export function registerEvmSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCPublicClient('eip155', (config) => new EvmHTLCPublicClient(config))
    s.registerHTLCWalletClient('eip155', (config) => new EvmHTLCWalletClient(config))

    a.registerWalletSign('eip155', async (config) => {
        return deriveKeyFromEvmSignature(config.provider, config.address, config.options)
    })
}

export { EvmHTLCPublicClient, EvmHTLCWalletClient } from './client/index.js'
export type { EvmHTLCPublicClientConfig, EvmHTLCWalletClientConfig, EvmSigner } from './types.js'
export { deriveKeyFromEvmSignature, getEvmTypedData } from './login/index.js'
export type { Eip1193Provider } from './login/index.js'
