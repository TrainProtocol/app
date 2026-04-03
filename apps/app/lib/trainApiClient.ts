// Compatibility wrapper — delegates to @train-protocol/sdk TrainApiClient
// Preserves the original uppercase method names used across the app.
import AppSettings from './AppSettings'
import {
    TrainApiClient as SdkTrainApiClient,
    Network,
} from '@train-protocol/sdk'

// Re-export all types from SDK so existing imports keep working
export type {
    HTLCFromApiResponse,
    HTLCFromApi,
    SolverProfile,
    SolverQuote,
    QuoteDetails,
    AggregatedQuoteResponse,
    SwapQuoteResponse,
    SwapQuote,
    RevealSecretParams,
    OrderCreatedEventData, 
    OrderStreamEvent,
    TransactionCreatedEventData,
    StatusChangedEventData
} from '@train-protocol/sdk'
export { HTLCTransaction } from '@train-protocol/sdk'

export default class TrainApiClient {
    private _sdk: SdkTrainApiClient

    constructor() {
        this._sdk = new SdkTrainApiClient({ baseUrl: AppSettings.TrainApiUri ?? '' })
    }

    /** Used by useFee SWR fetcher — returns raw fetch response */
    fetcher = (url: string) => {
        const fullUrl = `${AppSettings.TrainApiUri}/api/v1${url}`
        return fetch(fullUrl, {
            headers: { 'Content-Type': 'application/json' },
        }).then(r => r.json())
    }

    async GetNetworksAsync(): Promise<Network[]> {
        return this._sdk.getNetworks()
    }

    async GetPricesAsync(): Promise<Record<string, number>> {
        return this._sdk.getPrices()
    }

    async GetOrder(solverId: string, hashlock: string) {
        const data = await this._sdk.getOrder(solverId, hashlock)
        return { data }
    }

    async RevealSecret(params: { secret: string }, hashlock: string, solverId: string) {
        await this._sdk.revealSecret(solverId, hashlock, params.secret)
        return { data: {} }
    }
}