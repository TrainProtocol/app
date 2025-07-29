import AppSettings from "./AppSettings";
import { InitializeUnauthInstance } from "./axiosInterceptor"
import { AxiosInstance, Method } from "axios";
import { ApiResponse, EmptyApiResponse } from "../Models/ApiResponse";
import { Network, Route } from "../Models/Network";

export default class LayerSwapApiClient {
    static apiBaseEndpoint?: string = AppSettings.LayerswapApiUri;
    _unauthInterceptor: AxiosInstance
    constructor() {
        this._unauthInterceptor = InitializeUnauthInstance(LayerSwapApiClient.apiBaseEndpoint)
    }

    fetcher = (url: string) => this.UnauthenticatedRequest<any>("GET", url)

    async GetLSNetworksAsync(): Promise<Network[]> {
        return await this.UnauthenticatedRequest<Network[]>("GET", `/networks`);
    }

    async GetRoutesAsync(): Promise<Route[]> {
        return await this.UnauthenticatedRequest<Route[]>("GET", `/routes`);
    }

    async GetSwapsAsync(addresses: string[], page?: number): Promise<ApiResponse<CommitFromApi[]>> {
        const addressesQuery = addresses.map(a => `addresses=${a}`).join('&');
        return await this.UnauthenticatedRequest<ApiResponse<CommitFromApi[]>>("GET", `/swaps?${addressesQuery}&page=${page ? page : 1}`);
    }

    async AddLockSig(params: AddLockSig, commit_id: string, solver: string): Promise<ApiResponse<{}>> {
        return await this.UnauthenticatedRequest<ApiResponse<{}>>("POST", `/${solver}/swaps/${commit_id}/addLockSig`, params);
    }

    private async UnauthenticatedRequest<T>(method: Method, endpoint: string, data?: any, header?: {}): Promise<T> {
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
    sourceToken: string,
    sourceAmount: number,
    sourceAmountInUsd: number,
    sourceAddress: string,
    destinationNetwork: string,
    destinationToken: string,
    destinationAmount: number,
    destinationAmountInUsd: number,
    destinationAddress: string,
    feeAmount: number,
    sourceContractAddress: string,
    destinationContractAddress: string,
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
    solverName: string,
    totalFee: string,
    receiveAmount: string,
    destinationSolverAddress: string,
    sourceSolverAddress: string,
    sourceContractAddress: string,
    destinationContractAddress: string
}