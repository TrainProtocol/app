import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { StarknetHTLCPublicClient, StarknetHTLCWalletClient } from './client/index.js'
import { deriveKeyFromStarknetWallet } from './login/index.js'

export { StarknetHTLCPublicClient, StarknetHTLCWalletClient } from './client/index.js'
export type { StarknetHTLCPublicClientConfig, StarknetHTLCWalletClientConfig, StarknetSigner, StarknetTransactionRequest } from './types.js'
export type { BuildApproveTxParams } from './client/wallet/buildApproveTx.js'
export { formatStarknetAddress } from './utils.js'
export { deriveKeyFromStarknetWallet } from './login/index.js'
export type { StarknetAccountLike } from './login/index.js'

/**
 * Explicitly register the Starknet HTLC client and wallet-sign factories.
 * Call once at app startup. Safe to call multiple times (idempotent via Map.set).
 */
export function registerStarknetSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCPublicClient('starknet', (config) => new StarknetHTLCPublicClient(config))
    s.registerHTLCWalletClient('starknet', (config) => new StarknetHTLCWalletClient(config))

    a.registerWalletSign('starknet', async (config) => {
        return deriveKeyFromStarknetWallet(config.provider, config.address, config.options)
    })
}
