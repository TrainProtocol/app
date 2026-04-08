export type ExplorerUrlTemplate = {
    transaction?: string;
    address?: string;
}

export class Network {
    caip2Id: string;
    displayName: string;
    chainId: string;
    nativeTokenAddress: string;
    networkType: string;
    tokens: Token[];
    trainContract: string;
    explorerUrlTemplate?: ExplorerUrlTemplate;
    logoUrl?: string;
}

export const getNativeToken = (network: Network | undefined | null): Token | undefined =>
    !network ? undefined : network.tokens?.find(t => t.contract === network.nativeTokenAddress);

export class Token {
    symbol: string;
    contract: string;
    decimals: number;
    logo?: string;
}
