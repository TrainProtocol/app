import { registerHTLCClient, registerWalletSign } from '@train-protocol/sdk'
import { StarknetHTLCClient } from './client.js'
import { deriveKeyFromStarknetWallet } from './login/index.js'

export { StarknetHTLCClient } from './client.js'
export type { StarknetHTLCClientConfig, StarknetSigner } from './types.js'
export { formatStarknetAddress } from './utils.js'
export { deriveKeyFromStarknetWallet } from './login/index.js'
export type { StarknetAccountLike } from './login/index.js'

let registered = false

/**
 * Explicitly register the Starknet HTLC client and wallet-sign factories.
 * Call once at app startup. Safe to call multiple times (idempotent).
 */
export function registerStarknetSdk(): void {
    if (registered) return
    registered = true

    registerHTLCClient('starknet', (config) => new StarknetHTLCClient(config))

    registerWalletSign('starknet', async (config) => {
        return deriveKeyFromStarknetWallet(config.provider, config.address, config.options)
    })
}
