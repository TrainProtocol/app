import type { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import type { SolanaWalletLike } from './login/index.js'
import { BN } from '@coral-xyz/anchor'

declare module '@train-protocol/sdk' {
    interface HTLCPublicClientConfigMap {
        solana: SolanaHTLCPublicClientConfig
    }
    interface HTLCWalletClientConfigMap {
        solana: SolanaHTLCWalletClientConfig
    }
    interface HTLCTransactionRequestMap {
        solana: Transaction
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

export type SolanaHTLCPublicClientConfig = {
    rpcUrl: string
}

export type SolanaHTLCWalletClientConfig = SolanaHTLCPublicClientConfig & {
    signer: SolanaSigner
}


// --- Internal Types ---
export interface UserLockData {
    amount: BN
    timelock: BN
    sender: PublicKey
    recipient: PublicKey
    secret: number[]
    tokenMint: PublicKey
    status: number
}

export interface SolverLockData {
    amount: BN
    reward: BN
    timelock: BN
    rewardTimelock: BN
    sender: PublicKey
    recipient: PublicKey
    rewardRecipient: PublicKey
    secret: number[]
    tokenMint: PublicKey
    rewardTokenMint: PublicKey
    status: number
}

export type TypedProgramAccounts = {
    userLock: { fetch(pda: PublicKey): Promise<UserLockData> }
    solverLock: { fetch(pda: PublicKey): Promise<SolverLockData> }
    solverLockCounter: { fetch(pda: PublicKey): Promise<{ count: BN }> }
}
