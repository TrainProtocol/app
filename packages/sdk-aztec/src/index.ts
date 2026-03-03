import { registerHTLCClient } from '@train-protocol/sdk'
import { AztecHTLCClient } from './client'
import type { AztecSigner } from './types'

export { AztecHTLCClient } from './client'
export type { AztecHTLCClientConfig, AztecSigner } from './types'

let registered = false

export function registerAztecSdk(): void {
    if (registered) return
    registered = true

    registerHTLCClient('AZTEC_TESTNET', (config) => new AztecHTLCClient({
        rpcUrl: config.rpcUrl as string,
        signer: config.signer as AztecSigner | undefined,
        apiClient: config.apiClient,
    }))
}
