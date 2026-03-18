import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { StarknetHTLCClient } from './client.js'
import { deriveKeyFromStarknetWallet } from './login/index.js'

export { StarknetHTLCClient } from './client.js'
export type { StarknetHTLCClientConfig, StarknetSigner } from './types.js'
export { deriveKeyFromStarknetWallet } from './login/index.js'
export type { StarknetAccountLike } from './login/index.js'

/**
 * Explicitly register the Starknet HTLC client and wallet-sign factories.
 * Call once at app startup. Safe to call multiple times (idempotent via Map.set).
 */
export function registerStarknetSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCClient('starknet', (config) => new StarknetHTLCClient(config))

    a.registerWalletSign('starknet', async (config) => {
        return deriveKeyFromStarknetWallet(config.provider, config.address, config.options)
    })
}
