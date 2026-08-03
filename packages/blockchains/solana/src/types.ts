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
    secret: number[]
    amount: BN
    sender: PublicKey
    timelock: BN
    startTime: BN
    status: number
    recipient: PublicKey
    refundTo: PublicKey
    tokenMint: PublicKey
    rentPayer: PublicKey
    payoutCurve: PublicKey
    payoutCurveData: number[]
}

export interface SolverLockData {
    secret: number[]
    amount: BN
    reward: BN
    sender: PublicKey
    timelock: BN
    rewardTimelock: BN
    startTime: BN
    recipient: PublicKey
    status: number
    rewardRecipient: PublicKey
    refundTo: PublicKey
    tokenMint: PublicKey
    rewardTokenMint: PublicKey
    rentPayer: PublicKey
    payoutCurve: PublicKey
    payoutCurveData: number[]
}

export type TypedProgramAccounts = {
    userLock: { fetch(pda: PublicKey): Promise<UserLockData> }
    solverLock: {
        fetch(pda: PublicKey): Promise<SolverLockData>
        /**
         * `null` when the account is absent or empty; RPC and decode failures still throw.
         * Reads that must distinguish "no lock yet" from "the node failed" use this rather
         * than catching around `fetch`, which conflates the two.
         */
        fetchNullable(pda: PublicKey): Promise<SolverLockData | null>
    }
}
