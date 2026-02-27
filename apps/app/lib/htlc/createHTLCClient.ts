import { WalletClient } from 'viem'
import { EvmHTLCClient, IHTLCClient } from '@train-protocol/sdk'
import { Network } from '../../Models/Network'

export function createHTLCClient(
    network: Network,
    getEffectiveRpcUrls: (network: Network) => string[],
    walletClient?: WalletClient
): IHTLCClient {
    const chainType = network.caip2Id.split(':')[0]
    const rpcUrl = getEffectiveRpcUrls(network)[0] ?? network.nodes?.[0]?.url ?? ''

    switch (chainType) {
        case 'eip155':
            return new EvmHTLCClient({ rpcUrl, walletClient })
        default:
            throw new Error(`Unsupported chain type: ${chainType} for network ${network.caip2Id}`)
    }
}
