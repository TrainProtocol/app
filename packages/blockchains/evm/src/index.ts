import { registerHTLCClient, registerWalletSign } from '@train-protocol/sdk'
import { EvmHTLCClient } from './client.js'
import { deriveKeyFromEvmSignature } from './login/index.js'

let registered = false

/**
 * Explicitly register the EVM HTLC client and wallet-sign factories.
 * Call once at app startup. Safe to call multiple times (idempotent).
 */
export function registerEvmSdk(): void {
    if (registered) return
    registered = true

    registerHTLCClient('eip155', (config) => new EvmHTLCClient(config))

    registerWalletSign('eip155', async (config) => {
        return deriveKeyFromEvmSignature(config.provider, config.address, config.options)
    })
}

export { EvmHTLCClient } from './client.js'
export type { EvmHTLCClientConfig, EvmSigner } from './types.js'
export { deriveKeyFromEvmSignature, getEvmTypedData } from './login/index.js'
export type { Eip1193Provider } from './login/index.js'
