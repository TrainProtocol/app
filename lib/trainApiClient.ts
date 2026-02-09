import AppSettings from "./AppSettings";
import { InitializeUnauthInstance } from "./axiosInterceptor"
import { AxiosInstance, Method } from "axios";
import { ApiResponse } from "../Models/ApiResponse";
import { Network, Route } from "../Models/Network";

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

    async GetRoutesAsync(): Promise<Route[]> {
        const response = await this.UnauthenticatedRequest<{ data: Route[] }>("GET", `/routes`);
        return response.data;
    }

    async GetSwapsAsync(addresses: string[], page?: number): Promise<ApiResponse<CommitFromApi[]>> {
        const addressesQuery = addresses.map(a => `addresses=${a}`).join('&');
        return await this.UnauthenticatedRequest<ApiResponse<CommitFromApi[]>>("GET", `/swaps?${addressesQuery}&page=${page ? page : 1}`);
    }

    async AddLockSig(params: AddLockSig, commit_id: string, solver: string): Promise<ApiResponse<{}>> {
        return await this.UnauthenticatedRequest<ApiResponse<{}>>("POST", `/${solver}/swaps/${commit_id}/addLockSig`, params);
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

export type SwapQuote = {
    sourceSolverAddress: string;
    sourceSignerAgent: string;
    destinationSolverAddress: string;
    destinationSignerAgent: string;
    sourceContractAddress: string | null;
    destinationContractAddress: string | null;
    route: Route;
    totalFee: string;
    totalServiceFee: string;
    totalExpenseFee: string;
    receiveAmount: string;
}