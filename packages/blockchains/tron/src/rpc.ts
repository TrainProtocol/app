import type {
    TronUnsignedTransaction,
    TronTransactionInfo,
    TronTransaction,
} from './types.js'

export class TronRpcError extends Error {
    constructor(
        message: string,
        public code?: string,
        public data?: unknown
    ) {
        super(message)
        this.name = 'TronRpcError'
    }
}

export class TronRpcClient {
    constructor(
        private baseUrl: string,
        private apiKey?: string
    ) {}

    private headers(): Record<string, string> {
        const h: Record<string, string> = { 'Content-Type': 'application/json' }
        if (this.apiKey) h['TRON-PRO-API-KEY'] = this.apiKey
        return h
    }

    private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(body),
        })
        if (!response.ok) {
            throw new TronRpcError(`TronGrid HTTP error: ${response.status} ${response.statusText}`)
        }
        return response.json() as Promise<T>
    }

    /**
     * Read-only contract call via triggerconstantcontract.
     * Returns the first element of constant_result (hex-encoded return data).
     */
    async triggerConstantContract(
        contractAddress: string,
        functionSelector: string,
        parameter: string,
        ownerAddress: string,
    ): Promise<string> {
        const result = await this.post<{
            result: { result: boolean; code?: string; message?: string }
            constant_result?: string[]
            transaction?: unknown
        }>('/wallet/triggerconstantcontract', {
            contract_address: contractAddress,
            function_selector: functionSelector,
            parameter,
            owner_address: ownerAddress,
            visible: false,
        })

        if (!result.result?.result) {
            const msg = result.result?.message
                ? Buffer.from(result.result.message, 'hex').toString('utf8')
                : 'triggerconstantcontract failed'
            throw new TronRpcError(msg, result.result?.code, result)
        }

        if (!result.constant_result?.length) {
            throw new TronRpcError('No constant_result returned')
        }

        return result.constant_result[0]
    }

    /**
     * Build an unsigned transaction for a write operation.
     * Returns the unsigned transaction object for signing.
     */
    async triggerSmartContract(
        contractAddress: string,
        functionSelector: string,
        parameter: string,
        ownerAddress: string,
        callValue?: number,
        feeLimit?: number,
    ): Promise<TronUnsignedTransaction> {
        const result = await this.post<{
            result: { result: boolean; code?: string; message?: string }
            transaction: TronUnsignedTransaction
        }>('/wallet/triggersmartcontract', {
            contract_address: contractAddress,
            function_selector: functionSelector,
            parameter,
            owner_address: ownerAddress,
            call_value: callValue ?? 0,
            fee_limit: feeLimit,
            visible: false,
        })

        if (!result.result?.result) {
            const msg = result.result?.message
                ? Buffer.from(result.result.message, 'hex').toString('utf8')
                : 'triggersmartcontract failed'
            throw new TronRpcError(msg, result.result?.code, result)
        }

        return result.transaction
    }

    /** Fetch transaction by ID */
    async getTransactionById(txId: string): Promise<TronTransaction | null> {
        const result = await this.post<TronTransaction | Record<string, never>>(
            '/wallet/gettransactionbyid',
            { value: txId }
        )
        if (!result || !('txID' in result)) return null
        return result as TronTransaction
    }

    /** Fetch transaction info (receipt, logs) by ID */
    async getTransactionInfoById(txId: string): Promise<TronTransactionInfo | null> {
        const result = await this.post<TronTransactionInfo | Record<string, never>>(
            '/wallet/gettransactioninfobyid',
            { value: txId }
        )
        if (!result || !('id' in result)) return null
        return result as TronTransactionInfo
    }
}
