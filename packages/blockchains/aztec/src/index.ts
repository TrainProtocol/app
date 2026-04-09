import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { AztecHTLCPublicClient, AztecHTLCWalletClient } from './client/index'
import { deriveKeyFromAztecWallet } from './login/index'

export { AztecHTLCPublicClient, AztecHTLCWalletClient } from './client/index'
export type { AztecHTLCPublicClientConfig, AztecHTLCWalletClientConfig, AztecSigner } from './types'
export { deriveKeyFromAztecWallet } from './login/index'
export type { AztecWalletLike } from './login/index'

export function registerAztecSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCPublicClient('aztec', (config) => new AztecHTLCPublicClient(config))
    s.registerHTLCWalletClient('aztec', (config) => new AztecHTLCWalletClient(config))

    a.registerWalletSign('aztec', async (config) => {
        return deriveKeyFromAztecWallet(config.wallet, config.address)
    })
}
