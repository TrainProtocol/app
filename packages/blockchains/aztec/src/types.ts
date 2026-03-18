import type { Wallet } from '@aztec/aztec.js/wallet'
import type { AztecWalletLike } from './login/wallet-sign.js'

declare module '@train-protocol/sdk' {
    interface HTLCClientConfigMap {
        aztec: AztecHTLCClientConfig
    }
}

declare module '@train-protocol/auth' {
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

export type AztecHTLCClientConfig = {
    rpcUrl: string
    signer?: AztecSigner
}
