import { Network, Token } from '../types/network'
import {
    HTLCFromApiResponse,
    HTLCFromApi,
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

    async getOrder(solverId: string, hashlock: string): Promise<HTLCFromApiResponse> {
        const data = await this.request<{ data: HTLCFromApiResponse }>('GET', `/orders/${solverId}/${hashlock}`)
        return data.data
    }

    async revealSecret(solverId: string, hashlock: string, secret: string): Promise<void> {
        const params: RevealSecretParams = { secret }
        await this.request<unknown>('POST', `/orders/${solverId}/${hashlock}/reveal-secret`, params)
    }

    async getQuote(params: {
        amount: string
        sourceNetwork: string
        sourceTokenContract?: string
        destinationNetwork: string
        destinationTokenContract?: string
        includeReward?: boolean
    }): Promise<AggregatedQuoteResponse> {
        const { includeReward = true, sourceTokenContract, destinationTokenContract, ...rest } = params
        const urlParams = new URLSearchParams({
            ...rest,
            includeReward: String(includeReward),
        })
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
                'Access-Control-Allow-Origin': '*',
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
