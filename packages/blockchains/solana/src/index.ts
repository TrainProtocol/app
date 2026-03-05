import { registerHTLCClient, registerWalletSign } from '@train-protocol/sdk'
import { SolanaHTLCClient } from './client.js'
import { deriveKeyFromSolanaWallet } from './login/index.js'
import type { SolanaWalletLike } from './login/index.js'
import type { SolanaSigner } from './types.js'

export { SolanaHTLCClient } from './client.js'
export type { SolanaHTLCClientConfig, SolanaSigner } from './types.js'
export { deriveKeyFromSolanaWallet } from './login/index.js'
export type { SolanaWalletLike } from './login/index.js'
export { userLockTransactionBuilder as phtlcTransactionBuilder } from './transactionBuilder.js'
export type { UserLockParams as PhtlcParams } from './transactionBuilder.js'
export { TrainHtlc } from './idl/trainHtlc.js'
export const TRAIN_HTLC_PROGRAM_ID = '6zasug6x5AY93zNVjPZPGoqQfdTBd3C1w6CU9NDKtNH8'

let registered = false

export function registerSolanaSdk(): void {
    if (registered) return
    registered = true

    registerHTLCClient('solana', (config) => new SolanaHTLCClient({
        rpcUrl: config.rpcUrl as string,
        signer: config.signer as SolanaSigner | undefined,
        apiClient: config.apiClient,
    }))

    registerWalletSign('solana', async (config) => {
        return deriveKeyFromSolanaWallet(config.wallet as SolanaWalletLike)
    })
}
