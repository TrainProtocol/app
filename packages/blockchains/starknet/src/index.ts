import { registerHTLCClient, registerWalletSign } from '@train-protocol/sdk'
import { StarknetHTLCClient } from './client.js'
import { deriveKeyFromStarknetWallet } from './login/index.js'
import type { StarknetAccountLike } from './login/index.js'
import type { StarknetSigner } from './types.js'

export { StarknetHTLCClient } from './client.js'
export type { StarknetHTLCClientConfig, StarknetSigner } from './types.js'
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

    registerHTLCClient('starknet', (config) => new StarknetHTLCClient({
        rpcUrl: config.rpcUrl as string,
        signer: config.signer as StarknetSigner | undefined,
        apiClient: config.apiClient,
    }))

    registerWalletSign('starknet', async (config) => {
        return deriveKeyFromStarknetWallet(
            config.provider as StarknetAccountLike,
            config.address as string,
            config.options as { chainId?: string } | undefined,
        )
    })
}
