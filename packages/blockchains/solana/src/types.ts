import type { Transaction, VersionedTransaction } from '@solana/web3.js'
import type { SolanaWalletLike } from './login/index.js'

declare module '@train-protocol/sdk' {
    interface HTLCClientConfigMap {
        solana: SolanaHTLCClientConfig
    }
}

declare module '@train-protocol/auth' {
    interface WalletSignConfigMap {
        solana: SolanaWalletSignConfig
    }
}

export type SolanaWalletSignConfig = {
    wallet: SolanaWalletLike
}

/**
 * Framework-agnostic Solana signer.
 * The app wraps @solana/wallet-adapter-react hooks into this interface.
 */
export interface SolanaSigner {
    /** Base58 public key string */
    publicKey: string
    sendTransaction(tx: Transaction | VersionedTransaction): Promise<string>
}

export type SolanaHTLCClientConfig = {
    rpcUrl: string
    signer?: SolanaSigner
}