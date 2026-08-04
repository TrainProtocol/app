import KnownInternalNames from '../knownIds'

export type HeliosKind = 'ethereum' | 'opstack' | 'linea'

export interface HeliosNetworkEntry {
    kind: HeliosKind
    /**
     * Execution-layer JSON-RPC used by helios for proofs (eth_getProof etc.).
     * Helios verifies every response cryptographically, so the endpoint does not
     * need to be trusted — it needs to be capable (drpc's free tier rejects
     * helios's eth_getProof pattern; publicnode handles it).
     */
    executionRpc: string
    /** Same-origin sanitizing beacon proxy (see app/api/beacon/[network]/[...path]/route.ts). */
    beaconProxyPath: string
    /** Helios network preset (fork schedule etc.). */
    network: string
    /** Used when the live finalized-checkpoint fetch fails. Refresh when re-vendoring helios. */
    fallbackCheckpoint: string
}

/**
 * Networks the Helios light client can verify. OP Stack and Linea kinds are
 * omitted: their sync depends on a16z-hosted consensus services
 * (*.operationsolarstorm.org) which are down/broken as of Aug 2026.
 */
export const HELIOS_NETWORKS: Record<string, HeliosNetworkEntry> = {
    [KnownInternalNames.Networks.EthereumSepolia]: {
        kind: 'ethereum',
        executionRpc: 'https://ethereum-sepolia-rpc.publicnode.com',
        beaconProxyPath: '/api/beacon/sepolia',
        network: 'sepolia',
        fallbackCheckpoint: '0xa2f5c415250fdf33359a7ccab9ff544ff5d80eff444707f75c8472558f7fe5eb',
    },
    [KnownInternalNames.Networks.EthereumMainnet]: {
        kind: 'ethereum',
        executionRpc: 'https://ethereum-rpc.publicnode.com',
        beaconProxyPath: '/api/beacon/mainnet',
        network: 'mainnet',
        fallbackCheckpoint: '0xdf7877d34cd64a9c9eeae696f8beb917e97f10b5af506bdbee9be0a264f9f4ef',
    },
}
