import { HELIOS_NETWORKS } from './networks'

export const LIGHT_CLIENT_SUPPORTED_NETWORKS: string[] = Object.keys(HELIOS_NETWORKS)

export function supportsLightClient(network: { caip2Id: string }): boolean {
    return network.caip2Id in HELIOS_NETWORKS
}
