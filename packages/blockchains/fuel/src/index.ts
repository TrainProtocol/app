import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { FuelHTLCPublicClient, FuelHTLCWalletClient } from './client/index.js'
import { deriveKeyFromFuelWallet } from './login/index.js'

export { FuelHTLCPublicClient, FuelHTLCWalletClient } from './client/index.js'
export { deriveKeyFromFuelWallet } from './login/index.js'
export type {
    FuelHTLCPublicClientConfig,
    FuelHTLCWalletClientConfig,
    FuelSigner,
    FuelTransactionRequest,
    FuelWalletLike,
} from './types.js'

export function registerFuelSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCPublicClient('fuel', config => new FuelHTLCPublicClient(config))
    s.registerHTLCWalletClient('fuel', config => new FuelHTLCWalletClient(config))
    a.registerWalletSign('fuel', async config => deriveKeyFromFuelWallet(config.wallet))
}
