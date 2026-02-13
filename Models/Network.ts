export type NetworkTypeInfo = {
    name: string;           // "eip155"
    displayName: string;    // "EVM"
    nativeTokenAddress: string;
    addressFormat: string;
    addressLength: number;
    curve: string;
}

export type NetworkNode = {
    providerName: string;
    url: string;
}

export type NetworkContract = {
    type: string;   // "Train", "Multicall"
    address: string;
}

export class Network {
    caip2Id: string;
    slug: string;
    displayName: string;
    chainId: string;
    nativeTokenAddress: string;
    type: NetworkTypeInfo;
    tokens: Token[];
    nodes: NetworkNode[];
    contracts: NetworkContract[];
    metadata: any[];
    /** Set by getSettings when resolving logo URL */
    logo?: string;
}

export const getNativeToken = (network: Network | undefined | null): Token | undefined =>
    !network ? undefined : network.tokens?.find(t => t.contractAddress === network.nativeTokenAddress);

export class Token {
    symbol: string;
    contractAddress: string;
    decimals: number;
    priceInUsd?: number;
    /** Optional; may be set when resolving from API or UI */
    logo?: string;
}
