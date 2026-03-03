import { registerHTLCClient, registerWalletSign } from '@train-protocol/sdk'
import { AztecHTLCClient } from './client'
import { deriveKeyFromAztecWallet } from './login/index'
import type { AztecWalletLike } from './login/index'
import type { AztecSigner } from './types'

export { AztecHTLCClient } from './client'
export type { AztecHTLCClientConfig, AztecSigner } from './types'
export { deriveKeyFromAztecWallet } from './login/index'
export type { AztecWalletLike } from './login/index'

let registered = false

export function registerAztecSdk(): void {
    if (registered) return
    registered = true

    registerHTLCClient('aztec', (config) => new AztecHTLCClient({
        rpcUrl: config.rpcUrl as string,
        signer: config.signer as AztecSigner | undefined,
        apiClient: config.apiClient,
    }))

    registerWalletSign('aztec', async (config) => {
        return deriveKeyFromAztecWallet(
            config.wallet as AztecWalletLike,
            config.address as string,
        )
    })
}
