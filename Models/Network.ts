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

export type RouteNetwork = {
    token: Token;
    network: {
        slug: string;
        displayName: string;
        chainId: string;
        type: string;           // "eip155" -- plain string in routes
        nativeTokenAddress: string;
        caip2Id: string;
    }
}

export type RouteWallet = {
    signerAgent: { name: string; url: string };
    name: string;
    address: string;
    networkType: string;
}

export type ServiceFee = {
    name: string;
    percentage: number;
    usdAmount: number;
    includeExpenseFee?: boolean;
}

export type Route = {
    id: number;
    source: RouteNetwork;
    destination: RouteNetwork;
    minAmountInSource: string;
    maxAmountInSource: string;
    status: string;
    rateProviderName: string;
    sourceWallet: RouteWallet;
    destinationWallet: RouteWallet;
    ignoreExpenseFee?: boolean;
    serviceFee: ServiceFee;
}
