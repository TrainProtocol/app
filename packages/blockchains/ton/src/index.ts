import { registerHTLCClient, registerWalletSign } from '@train-protocol/sdk'
import { TonHTLCClient } from './client.js'
import { deriveKeyFromTonWallet } from './login/index.js'

let registered = false

/**
 * Explicitly register the TON HTLC client and wallet-sign factories.
 * Call once at app startup. Safe to call multiple times (idempotent).
 */
export function registerTonSdk(): void {
    if (registered) return
    registered = true

    registerHTLCClient('ton', (config) => new TonHTLCClient(config))

    registerWalletSign('ton', async (config) => {
        return deriveKeyFromTonWallet(config.wallet)
    })
}

export { TonHTLCClient } from './client.js'
export type { TonHTLCClientConfig, TonSigner, TonWalletSignConfig } from './types.js'
export { deriveKeyFromTonWallet } from './login/index.js'
export type { TonWalletLike } from './login/index.js'
