import type { Transaction, VersionedTransaction } from '@solana/web3.js'
import type { BaseHTLCClientConfig } from '@train-protocol/sdk'

/**
 * Framework-agnostic Solana signer.
 * The app wraps @solana/wallet-adapter-react hooks into this interface.
 */
export interface SolanaSigner {
    /** Base58 public key string */
    publicKey: string
    sendTransaction(tx: Transaction | VersionedTransaction): Promise<string>
}

export type SolanaHTLCClientConfig = BaseHTLCClientConfig & {
    rpcUrl: string
    signer?: SolanaSigner
}