import AppSettings from "./AppSettings";
import { InitializeUnauthInstance } from "./axiosInterceptor"
import { AxiosInstance, Method } from "axios";
import { ApiResponse } from "../Models/ApiResponse";
import { Network, Token } from "../Models/Network";

export default class TrainApiClient {
    static apiBaseEndpoint?: string = AppSettings.TrainApiUri;
    _unauthInterceptor: AxiosInstance
    constructor() {
        this._unauthInterceptor = InitializeUnauthInstance(TrainApiClient.apiBaseEndpoint)
    }

    fetcher = (url: string) => this.UnauthenticatedRequest<any>("GET", url)

    async GetNetworksAsync(): Promise<Network[]> {
        const response = await this.UnauthenticatedRequest<{ data: StationNetworkResponse[] }>("GET", `/networks`);
        return (response.data ?? []).map(mapStationNetwork);
    }

    async GetPricesAsync(): Promise<Record<string, number>> {
        const response = await this.UnauthenticatedRequest<{ data: Record<string, number> }>("GET", `/prices`);
        return response.data ?? {};
    }

    async GetSwapsAsync(addresses: string[], page?: number): Promise<ApiResponse<HTLCFromApi[]>> {
        const addressesQuery = addresses.map(a => `addresses=${a}`).join('&');
        return await this.UnauthenticatedRequest<ApiResponse<HTLCFromApi[]>>("GET", `/swaps?${addressesQuery}&page=${page ? page : 1}`);
    }

    async GetOrder(solverId: string, hashlock: string): Promise<ApiResponse<HTLCFromApiResponse>> {
        return await this.UnauthenticatedRequest<ApiResponse<HTLCFromApiResponse>>("GET", `/orders/${solverId}/${hashlock}`);
    }

    async RevealSecret(params: RevealSecretParams, hashlock: string, solverId: string): Promise<ApiResponse<{}>> {
        return await this.UnauthenticatedRequest<ApiResponse<{}>>("POST", `/orders/${solverId}/${hashlock}/reveal-secret`, params);
    }

    private async UnauthenticatedRequest<T>(method: Method, endpoint: string, data?: any, header?: {}): Promise<T> {
        let uri = TrainApiClient.apiBaseEndpoint + "/api/v1" + endpoint;
        return await this._unauthInterceptor(uri, { method: method, data: data, headers: { 'Access-Control-Allow-Origin': '*', ...(header ? header : {}) } })
            .then(res => {
                return res?.data;
            })
            .catch(async reason => {
                return Promise.reject(reason);
            });
    }
}

export type RevealSecretParams = {
    secret: string
}

export type HTLCFromApiResponse = {
    order: HTLCFromApi;
    solver: SolverProfile;
}

export type HTLCFromApi = {
    hashlock: string,
    sourceAmount: number,
    sourceAmountInUsd: number,
    sourceAddress: string,
    destinationAmount: number,
    destinationAmountInUsd: number,
    destinationAddress: string,
    feeAmount: number,
    sourceContractAddress: string,
    destinationContractAddress: string,
    sourceWallet: {
        address: string,
        name: string,
        networkType: string,
    }
    destinationWallet: {
        address: string,
        name: string,
        networkType: string,
    }
    destination: {
        network: {
            chainId: string,
            displayName: string,
            feePercentageIncrease: number,
            feeType: string,
            htlcNativeContractAddress: string,
            htlcTokenContractAddress:string,
            name:string,
            type: string,
            nativeToken: {
                contract: string,
                decimals: number,
                symbol: string
            }
        },
        token: {
            symbol: string,
            contract: string,
            decimals: number
        },
    }
    transactions: {
        type: HTLCTransaction,
        hash: string,
        networkId: string
    }[]
}

export enum HTLCTransaction {
    HTLCLock = 'HTLCLock',
    HTLCRedeem = 'HTLCRedeem',
}

export type OrderStreamEvent = {
    eventType: 'order.created' | 'order.transaction_created' | 'order.status_changed'
    data: OrderCreatedEventData | TransactionCreatedEventData | StatusChangedEventData
}

export type OrderCreatedEventData = {
    hashlock: string
    routeId: number
    sourceAddress: string
    destinationAddress: string
    sourceAmount: string
    destinationAmount: string
}

export type TransactionCreatedEventData = {
    hashlock: string
    networkId: string
    transactionType: string
    transactionHash: string
}

export type StatusChangedEventData = {
    hashlock: string
    status: string
    failureReason: string | null
}

export type SolverProfile = {
    id: string;
    name: string;
    description?: string;
    logoUrl?: string;
}

export type SolverQuote = {
    solver: SolverProfile;
    isBest: boolean;
    quote?: QuoteDetails;
    quoteWithoutReward?: QuoteDetails;
}

type QuoteRouteEndpoint = {
    networkSlug: string;
    tokenSymbol: string;
    tokenContract: string;
    tokenDecimals: number;
}

type QuoteRoute = {
    source: QuoteRouteEndpoint;
    destination: QuoteRouteEndpoint;
    minAmountInSource: string;
    maxAmountInSource: string;
}

type QuoteDetails = {
    signature: string;
    totalFee: string;
    receiveAmount: string;
    sourceSolverAddress: string;
    destinationSolverAddress: string;
    quoteExpirationTimestampInSeconds: number;
    route: QuoteRoute;
    timelock: {
        timelockTimeSpanInSeconds: number;
    };
    reward: {
        amount: string;
        rewardTimelockTimeSpanInSeconds: number;
        rewardToken: string;
        rewardRecipientAddress: string;
    };
}

// Station API aggregated quote response
export type AggregatedQuoteResponse = {
    quotes: SolverQuote[];
    errors: { solverId: string; message: string }[];
}

export type SwapQuoteResponse = {
    error?: {
        message: string;
    };
    data?: AggregatedQuoteResponse;
}

// Represents a single resolved quote (best quote's quoteWithReward)
export type SwapQuote = QuoteDetails;

// Station API network response shape
type StationNetworkResponse = {
    caip2Id: string;
    displayName: string;
    chainId: string;
    networkType: string;
    logoUrl?: string;
    nativeTokenAddress: string;
    explorerUrlTemplate?: {
        transaction?: string;
        address?: string;
    };
    tokens: {
        symbol: string;
        contract: string;
        decimals: number;
        logoUrl?: string;
    }[];
}

function mapStationNetwork(n: StationNetworkResponse): Network {
    const tokens: Token[] = n.tokens.map(t => ({
        symbol: t.symbol,
        contractAddress: t.contract,
        decimals: t.decimals,
        logo: t.logoUrl,
    }))

    return {
        caip2Id: n.caip2Id,
        displayName: n.displayName,
        chainId: n.chainId,
        nativeTokenAddress: n.nativeTokenAddress,
        type: { name: n.networkType },
        tokens,
        nodes: [],
        contracts: [],
        metadata: [],
        explorerUrlTemplate: n.explorerUrlTemplate,
        logoUrl: n.logoUrl,
    }
}