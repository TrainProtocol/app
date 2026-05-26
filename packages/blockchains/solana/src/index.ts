import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { SolanaHTLCPublicClient, SolanaHTLCWalletClient } from './client/index.js'
import { deriveKeyFromSolanaWallet } from './login/index.js'

export { SolanaHTLCPublicClient, SolanaHTLCWalletClient } from './client/index.js'
export type { SolanaHTLCPublicClientConfig, SolanaHTLCWalletClientConfig, SolanaSigner } from './types.js'
export { deriveKeyFromSolanaWallet } from './login/index.js'
export type { SolanaWalletLike } from './login/index.js'
export { TrainHtlc } from './idl/trainHtlc.js'

export function registerSolanaSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCPublicClient('solana', (config) => new SolanaHTLCPublicClient(config))
    s.registerHTLCWalletClient('solana', (config) => new SolanaHTLCWalletClient(config))

    a.registerWalletSign('solana', async (config) => {
        return deriveKeyFromSolanaWallet(config.wallet)
    })
}
