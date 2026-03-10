import { registerHTLCClient, registerWalletSign } from '@train-protocol/sdk'
import { AztecHTLCClient } from './client'
import { deriveKeyFromAztecWallet } from './login/index'

export { AztecHTLCClient } from './client'
export type { AztecHTLCClientConfig, AztecSigner } from './types'
export { deriveKeyFromAztecWallet } from './login/index'
export type { AztecWalletLike } from './login/index'

let registered = false

export function registerAztecSdk(): void {
    if (registered) return
    registered = true

    registerHTLCClient('aztec', (config) => new AztecHTLCClient(config))

    registerWalletSign('aztec', async (config) => {
        return deriveKeyFromAztecWallet(config.wallet, config.address)
    })
}
