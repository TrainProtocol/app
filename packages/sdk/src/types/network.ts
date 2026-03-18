export type NetworkTypeInfo = {
    name: string;
}

export type NetworkNode = {
    providerName: string;
    url: string;
}

export type NetworkContract = {
    type: NetworkContractType;
    address: string;
}

export enum NetworkContractType {
    Train = "Train",
    Multicall = "Multicall",
}

export type ExplorerUrlTemplate = {
    transaction?: string;
    address?: string;
}

export class Network {
    caip2Id: string;
    displayName: string;
    chainId: string;
    nativeTokenAddress: string;
    type: NetworkTypeInfo;
    tokens: Token[];
    nodes: NetworkNode[];
    contracts: NetworkContract[];
    metadata: any[];
    explorerUrlTemplate?: ExplorerUrlTemplate;
    logoUrl?: string;
}

export const getNativeToken = (network: Network | undefined | null): Token | undefined =>
    !network ? undefined : network.tokens?.find(t => t.contractAddress === network.nativeTokenAddress);

export class Token {
    symbol: string;
    contractAddress: string;
    decimals: number;
    priceInUsd?: number;
    logo?: string;
}
