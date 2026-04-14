import { Network } from '../types/network'
import {
    HTLCFromApiResponse,
    AggregatedQuoteResponse,
    RevealSecretParams,
} from './types'

export interface TrainApiClientConfig {
    baseUrl: string
}

export class TrainApiError extends Error {
    override name = 'TrainApiError' as const
    constructor(message: string, public status: number) {
        super(message)
    }
}

export class TrainApiClient {
    private baseUrl: string

    constructor(config: TrainApiClientConfig) {
        if (!config.baseUrl) {
            throw new Error('TrainApiClient: baseUrl is required. Set NEXT_PUBLIC_TRAIN_API env var.')
        }
        this.baseUrl = config.baseUrl.replace(/\/$/, '')
    }

    async getNetworks(): Promise<Network[]> {
        const data = await this.request<{ data: Network[] }>('GET', '/networks')
        return (data.data ?? [])
    }

    async getPrices(): Promise<Record<string, number>> {
        const data = await this.request<{ data: Record<string, number> }>('GET', '/prices')
        return data.data ?? {}
    }

    async getOrder(hashlock: string, solverAddress?: string): Promise<HTLCFromApiResponse> {
        const query = solverAddress ? `?solverAddress=${encodeURIComponent(solverAddress)}` : ''
        const data = await this.request<{ data: HTLCFromApiResponse }>('GET', `/orders/${encodeURIComponent(hashlock)}${query}`)
        return data.data
    }

    async revealSecret(hashlock: string, secret: string, solverAddress?: string): Promise<void> {
        const query = solverAddress ? `?solverAddress=${encodeURIComponent(solverAddress)}` : ''
        const params: RevealSecretParams = { secret }
        await this.request<unknown>('POST', `/orders/${encodeURIComponent(hashlock)}/reveal-secret${query}`, params)
    }

    async getQuote(params: {
        amount?: string
        receiveAmount?: string
        sourceNetwork: string
        sourceTokenContract?: string
        destinationNetwork: string
        destinationTokenContract?: string
        includeReward?: boolean
    }): Promise<AggregatedQuoteResponse> {
        const { amount, receiveAmount, sourceNetwork, destinationNetwork, includeReward = true, sourceTokenContract, destinationTokenContract } = params
        const urlParams = new URLSearchParams({
            sourceNetwork,
            destinationNetwork,
            includeReward: String(includeReward),
        })
        if (amount) urlParams.set('amount', amount)
        if (receiveAmount) urlParams.set('receiveAmount', receiveAmount)
        if (sourceTokenContract) urlParams.set('sourceTokenContract', sourceTokenContract)
        if (destinationTokenContract) urlParams.set('destinationTokenContract', destinationTokenContract)
        const query = urlParams.toString()
        const data = await this.request<{ data: AggregatedQuoteResponse }>('GET', `/quote?${query}`)
        return data.data
    }

    private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
        const url = `${this.baseUrl}/api/v1${path}`
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        })

        if (!res.ok) {
            const text = await res.text().catch(() => res.statusText)
            throw new TrainApiError(`${method} ${path} failed (${res.status}): ${text}`, res.status)
        }

        return res.json() as Promise<T>
    }
}
