import type { BaseHTLCClientConfig } from '@train-protocol/sdk'
import type { TonWalletLike } from './login/index.js'

declare module '@train-protocol/sdk' {
    interface HTLCClientConfigMap {
        ton: TonHTLCClientConfig
    }
    interface WalletSignConfigMap {
        ton: TonWalletSignConfig
    }
}

export type TonWalletSignConfig = {
    wallet: TonWalletLike
}

/**
 * Minimal signer interface for TON write operations.
 * Integrators wrap their TonConnect UI (or compatible) into this interface.
 */
export interface TonSigner {
    /** The signer's TON address (raw or friendly format) */
    address: string

    /**
     * Sign and broadcast a transaction via TonConnect, returning the signed BOC.
     */
    sendTransaction(tx: {
        validUntil: number
        messages: { address: string; amount: string; payload?: string }[]
    }): Promise<{ boc: string }>
}

export type TonHTLCClientConfig = BaseHTLCClientConfig & {
    /** TonCenter API URL for read operations */
    rpcUrl: string
    /** Optional TonCenter API key */
    apiKey?: string
    /** Optional signer for write operations */
    signer?: TonSigner
}
