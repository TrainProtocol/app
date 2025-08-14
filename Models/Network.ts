
export enum NetworkType {
    EVM = "EVM",
    Starknet = "Starknet",
    Solana = "Solana",
    Cosmos = "Cosmos",
    StarkEx = "Starkex",
    ZkSyncLite = "zksynclite",
    TON = 'TON',
    Fuel = 'Fuel',
}

export class Network {
    name: string;
    displayName: string;
    logo: string;
    chainId: string | null;
    transactionExplorerTemplate: string;
    accountExplorerTemplate: string;
    nativeTokenSymbol: string;
    nativeTokenDecimals: number;
    type: NetworkType;
    rpcUrl: string
    contracts?: [
        {
            type: ContractType,
            address: string
        }
    ]
}


export type RouteNetwork = {
    token: Token,
    network: {
        name: string,
        chainId: string,
        type: NetworkType
    }
}

export type Route = {
    source: RouteNetwork,
    destination: RouteNetwork
}

export enum ContractType {
    HTLCTokenContractAddress = 'HTLCTokenContractAddress',
    HTLCNativeContractAddress = 'HTLCNativeContractAddress',
    EvmMultiCallContract = 'EvmMultiCallContract',
    GasPriceOracleContract = 'GasPriceOracleContract',
    ZksPaymasterContract = 'ZksPaymasterContract',
}

export class Token {
    symbol: string;
    logo: string;
    contract: string | null | undefined;
    decimals: number;
}