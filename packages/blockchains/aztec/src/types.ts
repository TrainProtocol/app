import type { Wallet } from '@aztec/aztec.js/wallet'
import type { AztecWalletLike } from './login/wallet-sign.js'

declare module '@train-protocol/sdk' {
    interface HTLCPublicClientConfigMap {
        aztec: AztecHTLCPublicClientConfig
    }
    interface HTLCWalletClientConfigMap {
        aztec: AztecHTLCWalletClientConfig
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

export type AztecHTLCPublicClientConfig = {
    rpcUrl: string
    /** Aztec requires a signer even for read operations (simulate needs wallet context) */
    signer?: AztecSigner
}

export type AztecHTLCWalletClientConfig = AztecHTLCPublicClientConfig & {
    signer: AztecSigner
}
