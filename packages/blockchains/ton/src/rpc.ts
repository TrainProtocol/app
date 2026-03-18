import { TonClient } from '@ton/ton'
import { Address, TupleItem, TupleReader } from '@ton/core'

/**
 * Thin wrapper around @ton/ton TonClient for contract read operations.
 * Decoupled from React / global singletons — each instance targets a specific RPC URL.
 */
export class TonRpcClient {
    private client: TonClient

    constructor(rpcUrl: string, apiKey?: string) {
        this.client = new TonClient({ endpoint: rpcUrl, apiKey })
    }

    /** Call a contract getter method and return the TupleReader for parsing. */
    async runMethod(
        address: string,
        method: string,
        args: TupleItem[] = [],
    ): Promise<TupleReader> {
        const result = await this.client.runMethod(
            Address.parse(address),
            method,
            args,
        )
        return result.stack
    }

    /** Get the underlying TonClient for advanced operations (e.g. JettonMaster). */
    getClient(): TonClient {
        return this.client
    }

    /** Create a new RPC client for a specific node URL (used by getSolverLockDetails). */
    static fromUrl(url: string, apiKey?: string): TonRpcClient {
        return new TonRpcClient(url, apiKey)
    }
}
