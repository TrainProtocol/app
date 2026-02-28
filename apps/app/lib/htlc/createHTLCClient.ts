import { createHTLCClient as createClient, IHTLCClient } from '@train-protocol/sdk'
import { Network } from '../../Models/Network'

export function createHTLCClient(
    network: Network,
    getEffectiveRpcUrls: (network: Network) => string[],
): IHTLCClient {
    const chainType = network.caip2Id.split(':')[0]
    const rpcUrl = getEffectiveRpcUrls(network)[0] ?? network.nodes?.[0]?.url ?? ''

    return createClient(chainType, { rpcUrl })
}
