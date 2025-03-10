import AppSettings from "./AppSettings";
import { InitializeUnauthInstance } from "./axiosInterceptor"
import { AxiosInstance, Method } from "axios";
import { ApiResponse, EmptyApiResponse } from "../Models/ApiResponse";
import { Network, Token } from "../Models/Network";

export default class LayerSwapApiClient {
    static apiBaseEndpoint?: string = AppSettings.LayerswapApiUri;
    static apiKey: string | undefined;

    _unauthInterceptor: AxiosInstance
    constructor() {
        this._unauthInterceptor = InitializeUnauthInstance(LayerSwapApiClient.apiBaseEndpoint)
    }

    fetcher = (url: string) => this.UnauthenticatedRequest<ApiResponse<any>>("GET", url)

    async GetLSNetworksAsync(): Promise<ApiResponse<Network[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<Network[]>>("GET", `/networks`);
    }

    async GetSwapsAsync(addresses: string[], page?: number): Promise<ApiResponse<CommitFromApi[]>> {
        const addressesQuery = addresses.map(a => `addresses=${a}`).join('&');
        return await this.UnauthenticatedRequest<ApiResponse<CommitFromApi[]>>("GET", `/swaps?${addressesQuery}&page=${page ? page : 1}`);
    }

    async AddLockSig(params: AddLockSig, commit_id: string): Promise<ApiResponse<{}>> {
        return await this.UnauthenticatedRequest<ApiResponse<{}>>("POST", `/swaps/${commit_id}/addLockSig`, params);
    }


    private async UnauthenticatedRequest<T extends EmptyApiResponse>(method: Method, endpoint: string, data?: any, header?: {}): Promise<T> {
        let uri = LayerSwapApiClient.apiBaseEndpoint + "/api" + endpoint;
        return await this._unauthInterceptor(uri, { method: method, data: data, headers: { 'Access-Control-Allow-Origin': '*', ...(header ? header : {}) } })
            .then(res => {
                return res?.data;
            })
            .catch(async reason => {
                return Promise.reject(reason);
            });
    }
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
    commitId: string,
    sourceNetwork: string,
    sourceAsset: string,
    destinationNetwork: string,
    destinationAsset: string,
    destinationAddress: string,
    liquidityProviderAddress: string,
    destinationAmount: number,
    feeAmount: number,
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

export type SwapQuote = {
    sourceNetwork?: Network,
    sourceToken?: Token,
    destinationNetwork?: Network,
    destinationToken?: Token,
    receiveAmount: number,
    minReceiveAmount: number,
    totalFee: number,
    totalFeeInUsd: number,
    blockchainFee: number,
    serviceFee: number,
    avgCompletionTime: string,
    refuelInSource?: number,
}