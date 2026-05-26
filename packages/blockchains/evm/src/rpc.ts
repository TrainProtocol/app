import type { RpcTransactionReceipt, RpcTransaction, RpcBlock } from './types.js'

export class JsonRpcError extends Error {
    constructor(
        message: string,
        public code: number,
        public data?: unknown
    ) {
        super(message)
        this.name = 'JsonRpcError'
    }
}

let requestId = 0

export class JsonRpcClient {
    constructor(private url: string) {}

    async call(method: string, params: unknown[]): Promise<unknown> {
        const response = await fetch(this.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: ++requestId,
                method,
                params,
            }),
        })

        if (!response.ok) {
            throw new Error(`RPC HTTP error: ${response.status} ${response.statusText}`)
        }

        const json = await response.json()
        if (json.error) {
            throw new JsonRpcError(json.error.message, json.error.code, json.error.data)
        }
        return json.result
    }

    /** Execute a read-only contract call (eth_call) */
    async ethCall(
        to: string,
        data: string,
        from?: string,
        value?: bigint,
        blockTag = 'latest'
    ): Promise<string> {
        const callObj: Record<string, string> = { to, data }
        if (from) callObj.from = from
        if (value) callObj.value = '0x' + value.toString(16)
        return this.call('eth_call', [callObj, blockTag]) as Promise<string>
    }

    async getTransactionReceipt(txHash: string): Promise<RpcTransactionReceipt | null> {
        return this.call('eth_getTransactionReceipt', [txHash]) as Promise<RpcTransactionReceipt | null>
    }

    async getTransaction(txHash: string): Promise<RpcTransaction | null> {
        return this.call('eth_getTransactionByHash', [txHash]) as Promise<RpcTransaction | null>
    }

    async getBlockByNumber(blockNumber: string, fullTxs = false): Promise<RpcBlock | null> {
        return this.call('eth_getBlockByNumber', [blockNumber, fullTxs]) as Promise<RpcBlock | null>
    }
}
