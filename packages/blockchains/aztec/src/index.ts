import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { AztecHTLCClient } from './client'
import { deriveKeyFromAztecWallet } from './login/index'

export { AztecHTLCClient } from './client'
export type { AztecHTLCClientConfig, AztecSigner } from './types'
export { deriveKeyFromAztecWallet } from './login/index'
export type { AztecWalletLike } from './login/index'

export function registerAztecSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCClient('aztec', (config) => new AztecHTLCClient(config))

    a.registerWalletSign('aztec', async (config) => {
        return deriveKeyFromAztecWallet(config.wallet, config.address)
    })
}
