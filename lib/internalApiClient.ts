
import axios from "axios";
import { ApiResponse } from "../Models/ApiResponse";
import { EstimateFee } from "starknet";

export default class InternalApiClient {

    async GetStarknetFee(queryParams: string, basePath: string): Promise<ApiResponse<EstimateFee>> {
        return await axios.get(`${basePath}/api/get_starknet_fee?${queryParams}`)
    }
}
