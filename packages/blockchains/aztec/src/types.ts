import type { Wallet } from '@aztec/aztec.js/wallet'
import { BaseHTLCClientConfig } from '@train-protocol/sdk'
import type { AztecWalletLike } from './login/wallet-sign.js'

declare module '@train-protocol/sdk' {
    interface HTLCClientConfigMap {
        aztec: AztecHTLCClientConfig
    }
    interface WalletSignConfigMap {
        aztec: AztecWalletSignConfig
    }
}

export type AztecWalletSignConfig = {
    wallet: AztecWalletLike
    address: string
}

export interface AztecSigner {
    wallet: Wallet
    address: string
}

export type AztecHTLCClientConfig = BaseHTLCClientConfig & {
    rpcUrl: string
    signer?: AztecSigner
}
