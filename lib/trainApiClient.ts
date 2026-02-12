import AppSettings from "./AppSettings";
import { InitializeUnauthInstance } from "./axiosInterceptor"
import { AxiosInstance, Method } from "axios";
import { ApiResponse } from "../Models/ApiResponse";
import { Network } from "../Models/Network";

export default class LayerSwapApiClient {
    static apiBaseEndpoint?: string = AppSettings.LayerswapApiUri;
    _unauthInterceptor: AxiosInstance
    constructor() {
        this._unauthInterceptor = InitializeUnauthInstance(LayerSwapApiClient.apiBaseEndpoint)
    }

    fetcher = (url: string) => this.UnauthenticatedRequest<any>("GET", url)

    async GetNetworksAsync(): Promise<Network[]> {
        const response = await this.UnauthenticatedRequest<{ data: Network[] }>("GET", `/networks`);
        return response.data;
    }

    async GetSwapsAsync(addresses: string[], page?: number): Promise<ApiResponse<CommitFromApi[]>> {
        const addressesQuery = addresses.map(a => `addresses=${a}`).join('&');
        return await this.UnauthenticatedRequest<ApiResponse<CommitFromApi[]>>("GET", `/swaps?${addressesQuery}&page=${page ? page : 1}`);
    }

    async AddLockSig(params: AddLockSig, hashlock: string, solver: string): Promise<ApiResponse<{}>> {
        return await this.UnauthenticatedRequest<ApiResponse<{}>>("POST", `/${solver}/swaps/${hashlock}/addLockSig`, params);
    }

    async RevealSecret(params: RevealSecretParams, hashlock: string, solver: string): Promise<ApiResponse<{}>> {
        return await this.UnauthenticatedRequest<ApiResponse<{}>>("POST", `/${solver}/swaps/${hashlock}/revealSecret`, params);
    }

    private async UnauthenticatedRequest<T>(method: Method, endpoint: string, data?: any, header?: {}): Promise<T> {
        let uri = LayerSwapApiClient.apiBaseEndpoint + "/api/v1" + endpoint;
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

export type AddLockSig = {
    r?: string
    s?: string
    v?: string
    signature?: any,
    signatureArray?: any,
    timelock: number
}

export type CommitFromApi = {
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
        type: CommitTransaction,
        hash: string,
        network: string
    }[]
}

export enum CommitTransaction {
    HTLCLock = 'HTLCLock',
    HTLCRedeem = 'HTLCRedeem',
    HTLCAddLockSig = 'HTLCAddLockSig'
}

export type Quote = {
    quote?: SwapQuote,
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

export type SwapQuoteResponse = {
    error?: {
        message: string;
    };
    data?: {
        quoteWithReward: QuoteDetails;
        quoteWithoutReward: QuoteDetails;
    };
}

// For backward compatibility - represents a single quote
export type SwapQuote = QuoteDetails;