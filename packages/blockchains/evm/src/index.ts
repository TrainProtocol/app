import { registerHTLCClient, registerWalletSign } from '@train-protocol/sdk'
import { EvmHTLCClient } from './client.js'
import { deriveKeyFromEvmSignature } from './login/index.js'
import type { Eip1193Provider } from './login/index.js'
import type { EvmSigner } from './types.js'

let registered = false

/**
 * Explicitly register the EVM HTLC client and wallet-sign factories.
 * Call once at app startup. Safe to call multiple times (idempotent).
 */
export function registerEvmSdk(): void {
    if (registered) return
    registered = true

    registerHTLCClient('eip155', (config) => new EvmHTLCClient({
        rpcUrl: config.rpcUrl as string,
        signer: config.signer as EvmSigner | undefined,
        chainId: config.chainId as number | undefined,
        apiClient: config.apiClient,
    }))

    registerWalletSign('eip155', async (config) => {
        return deriveKeyFromEvmSignature(
            config.provider as Eip1193Provider,
            config.address as `0x${string}`,
            config.options as { sandbox?: boolean; currentChainId?: number } | undefined,
        )
    })
}

export { EvmHTLCClient } from './client.js'
export type { EvmHTLCClientConfig, EvmSigner } from './types.js'
export { deriveKeyFromEvmSignature, getEvmTypedData } from './login/index.js'
export type { Eip1193Provider } from './login/index.js'
