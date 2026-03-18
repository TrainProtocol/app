import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { SolanaHTLCClient } from './client.js'
import { deriveKeyFromSolanaWallet } from './login/index.js'

export { SolanaHTLCClient } from './client.js'
export type { SolanaHTLCClientConfig, SolanaSigner } from './types.js'
export { deriveKeyFromSolanaWallet } from './login/index.js'
export type { SolanaWalletLike } from './login/index.js'
export { userLockTransactionBuilder, refundTransactionBuilder, redeemSolverTransactionBuilder } from './transactionBuilder.js'
export type { UserLockParams, RefundTxParams, RedeemSolverTxParams } from './transactionBuilder.js'
export { TrainHtlc } from './idl/trainHtlc.js'
export const TRAIN_HTLC_PROGRAM_ID = '6zasug6x5AY93zNVjPZPGoqQfdTBd3C1w6CU9NDKtNH8'

export function registerSolanaSdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCClient('solana', (config) => new SolanaHTLCClient(config))

    a.registerWalletSign('solana', async (config) => {
        return deriveKeyFromSolanaWallet(config.wallet)
    })
}
