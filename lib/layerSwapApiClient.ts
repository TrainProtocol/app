import AppSettings from "./AppSettings";
import { InitializeUnauthInstance } from "./axiosInterceptor"
import { AxiosInstance, Method } from "axios";
import { ApiResponse, EmptyApiResponse } from "../Models/ApiResponse";
import { NetworkWithTokens, Network, Token } from "../Models/Network";

export default class LayerSwapApiClient {
    static apiBaseEndpoint?: string = AppSettings.LayerswapApiUri;
    static apiKey: string | undefined;

    _unauthInterceptor: AxiosInstance
    constructor() {
        this._unauthInterceptor = InitializeUnauthInstance(LayerSwapApiClient.apiBaseEndpoint)
    }

    fetcher = (url: string) => this.UnauthenticatedRequest<ApiResponse<any>>("GET", url)

    async GetLSNetworksAsync(): Promise<ApiResponse<NetworkWithTokens[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<NetworkWithTokens[]>>("GET", `/networks`);
    }

    async AddLockSig(params: AddLockSig, commit_id: string): Promise<ApiResponse<{}>> {
        return await this.UnauthenticatedRequest<ApiResponse<{}>>("POST", `/swap/${commit_id}/add_lock_sig`, params);
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
    r: string
    s: string
    v: string
    signer_address: string,
    signature: string
    timelock: number
}

export type CommitFromApi = {
    source_netowrk: string,
    source_asset: string,
    destination_network: string,
    destination_asset: string,
    destination_address: string,
    liquidity_provider_address: string,
    locked_amount: number,
    receive_amount: number,
    fee_amount: number,
    transactions: {
        type: 'lock' | 'redeem' | 'addlocksig',
        hash: string,
        network: string
    }[]
}

export type Quote = {
    quote?: SwapQuote,
}

export type SwapQuote = {
    source_network?: Network,
    source_token?: Token,
    destination_network?: Network,
    destination_token?: Token,
    receive_amount: number,
    min_receive_amount: number,
    total_fee: number,
    total_fee_in_usd: number,
    blockchain_fee: number,
    service_fee: number,
    avg_completion_time: string,
    refuel_in_source?: number,
}

