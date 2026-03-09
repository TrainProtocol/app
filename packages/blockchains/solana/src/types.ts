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

export type SolanaHTLCClientConfig = {
    rpcUrl: string
    signer?: SolanaSigner
    /** Required for revealSecret; may be omitted for read-only / gas-estimation use. */
    apiClient?: BaseHTLCClientConfig['apiClient']
}

export const NATIVE_SOL_ADDRESS = '11111111111111111111111111111111'
