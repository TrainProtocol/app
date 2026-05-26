// Re-exported from @train-protocol/sdk — single source of truth
import { Token, Network, getNativeToken as sdkGetNativeToken } from '@train-protocol/sdk'
import NetworkSettings from '@/lib/NetworkSettings'
export { Network, Token }
export type { ExplorerUrlTemplate } from '@train-protocol/sdk'

export const getNativeToken = (network: Network | undefined | null): Token | undefined => {
    const native = sdkGetNativeToken(network)
    if (native || !network) return native
    const info = NetworkSettings.KnownSettings[network.caip2Id]?.NativeTokenInfo
    return info && { symbol: info.symbol, contract: network.nativeTokenAddress, decimals: info.decimals }
}

export enum NetworkTypes {
    EVM = "eip155",
    Solana = "solana",
    Starknet = "starknet",
    Aztec = "aztec",
    TON = "ton",
}

export class ExtendedNetwork extends Network {
    nodes: NetworkNode[];
    contracts: NetworkContract[];
    tokens: ExtendedToken[]
}


export type NetworkNode = {
    providerName: string;
    url: string;
}

export enum NetworkContractType {
    Train = "Train",
    Multicall = "Multicall",
}

export type NetworkContract = {
    type: NetworkContractType;
    address: string;
}

export class ExtendedToken extends Token {
    priceInUsd?: number;
}