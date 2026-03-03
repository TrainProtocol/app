import type { Wallet } from '@aztec/aztec.js/wallet'
import { BaseHTLCClientConfig } from '@train-protocol/sdk'

export interface AztecSigner {
    wallet: Wallet
    address: string
}

export type AztecHTLCClientConfig = BaseHTLCClientConfig & {
    rpcUrl: string
    signer?: AztecSigner
}
