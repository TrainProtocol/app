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
        // Return mock quote when Aztec is involved (no backend support yet)
        if (url.startsWith('/quote?') && url.includes('AZTEC_TESTNET')) {
            return Promise.resolve(buildAztecMockQuoteResponse(url))
        }

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

    async GetSwapsAsync(addresses: string[], page?: number) {
        const data = await this._sdk.getSwaps(addresses, page)
        return { data }
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

function buildAztecMockQuoteResponse(url: string): { data: { quotes: any[]; errors: any[] } } {
    const params = new URLSearchParams(url.split('?')[1])
    const amount = params.get('amount') ?? '0'
    const sourceNetwork = params.get('sourceNetwork') ?? ''
    const destinationNetwork = params.get('destinationNetwork') ?? ''
    const sourceTokenContract = params.get('sourceTokenContract') ?? ''
    const destinationTokenContract = params.get('destinationTokenContract') ?? ''

    const now = Math.floor(Date.now() / 1000)

    return {
        data: {
            quotes: [
                {
                    solver: {
                        id: 'plorex',
                        name: 'Plorex',
                        logoUrl: '',
                    },
                    isBest: true,
                    quote: {
                        signature: '0xmocksignature',
                        totalFee: '0',
                        receiveAmount: amount,
                        sourceSolverAddress: '0x0514ff3eeaf5cf9d45b66064332f808e17885ded3dc2e83391a266ab7506c7c1',
                        destinationSolverAddress: '0x0514ff3eeaf5cf9d45b66064332f808e17885ded3dc2e83391a266ab7506c7c1',
                        quoteExpirationTimestampInSeconds: now + 900,
                        route: {
                            source: {
                                networkSlug: sourceNetwork,
                                tokenSymbol: 'TEST',
                                tokenContract: sourceTokenContract,
                                tokenDecimals: 8,
                            },
                            destination: {
                                networkSlug: destinationNetwork,
                                tokenSymbol: 'TEST',
                                tokenContract: destinationTokenContract,
                                tokenDecimals: 8,
                            },
                            minAmountInSource: '1',
                            maxAmountInSource: '1000000000000',
                        },
                        timelock: {
                            timelockTimeSpanInSeconds: 30,
                        },
                        reward: {
                            amount: '100000000',
                            rewardTimelockTimeSpanInSeconds: 25,
                            rewardToken: '0x0',
                            rewardRecipientAddress: '0x0',
                        },
                    },
                },
            ],
            errors: [],
        },
    }
}
