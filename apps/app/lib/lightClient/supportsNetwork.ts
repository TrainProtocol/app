import KnownInternalNames from '../knownIds'

export const LIGHT_CLIENT_SUPPORTED_NETWORKS: string[] = [
    KnownInternalNames.Networks.EthereumMainnet,
    KnownInternalNames.Networks.EthereumSepolia,
    'eip155:10',    // Optimism mainnet
    'eip155:8453',  // Base mainnet
    'eip155:59144', // Linea mainnet
]

export function supportsLightClient(network: { caip2Id: string }): boolean {
    return LIGHT_CLIENT_SUPPORTED_NETWORKS.includes(network.caip2Id)
}
