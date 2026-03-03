import { createHTLCClient as createClient, IHTLCClient, TrainApiClient as SdkTrainApiClient } from '@train-protocol/sdk'
import { Network } from '../../Models/Network'
import AppSettings from '../AppSettings'

const apiClient = new SdkTrainApiClient({ baseUrl: AppSettings.TrainApiUri ?? '' })

export function createHTLCClient(
    network: Network,
    getEffectiveRpcUrls: (network: Network) => string[],
): IHTLCClient {
    const chainType = network.caip2Id.split(':')[0]
    const rpcUrl = getEffectiveRpcUrls(network)[0] ?? network.nodes?.[0]?.url ?? ''

    return createClient(chainType, { rpcUrl, apiClient })
}
