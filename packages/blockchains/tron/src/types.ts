import type { TronWalletLike } from './login/index.js'

declare module '@train-protocol/sdk' {
    interface HTLCClientConfigMap {
        tron: TronHTLCClientConfig
    }
}

declare module '@train-protocol/auth' {
    interface WalletSignConfigMap {
        tron: TronWalletSignConfig
    }
}

export type TronWalletSignConfig = {
    wallet: TronWalletLike
}

/**
 * Minimal signer interface for Tron write operations.
 * The SDK builds unsigned transactions via TronGrid API,
 * then the signer signs and broadcasts them.
 */
export interface TronSigner {
    /** Base58Check Tron address (T-prefix) */
    address: string

    /**
     * Sign and broadcast an unsigned transaction built by the SDK.
     * Returns the transaction ID (txID).
     */
    signAndBroadcast(unsignedTx: TronUnsignedTransaction): Promise<string>
}

/** Raw unsigned transaction from TronGrid triggersmartcontract response */
export interface TronUnsignedTransaction {
    txID: string
    raw_data: Record<string, unknown>
    raw_data_hex: string
    visible?: boolean
}

export type TronHTLCClientConfig = {
    /** TronGrid API URL (e.g. https://api.trongrid.io or https://nile.trongrid.io) */
    rpcUrl: string
    /** Optional API key for TronGrid rate limits */
    apiKey?: string
    /** Optional signer for write operations */
    signer?: TronSigner
}

/** TronGrid transaction info response */
export interface TronTransactionInfo {
    id: string
    blockNumber: number
    blockTimeStamp: number
    receipt: { result?: string }
    log?: TronEventLog[]
    result?: string
    contractResult?: string[]
}

/** TronGrid event log entry */
export interface TronEventLog {
    address: string
    topics: string[]
    data: string
}

/** TronGrid transaction response */
export interface TronTransaction {
    txID: string
    raw_data: {
        contract: Array<{
            parameter: {
                value: {
                    contract_address?: string
                    owner_address: string
                    data?: string
                    call_value?: number
                }
            }
            type: string
        }>
        timestamp: number
    }
    ret?: Array<{ contractRet: string }>
}
