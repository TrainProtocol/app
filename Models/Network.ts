
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
    tokens: Token[]
    nativeToken: Token;
    type: NetworkType;
    listingDate: string;
    isTestnet: boolean
    nodes: [
        {
            type: string
            url: string,
        }
    ]
    contracts: [
        {
            type: ContractType,
            address: string
        }
    ]
    managedAccounts: [
        {
            type: ManagedAccountType
            address: string,
        }
    ]
}

export enum ContractType {
    HTLCTokenContractAddress = 'HTLCTokenContractAddress',
    HTLCNativeContractAddress = 'HTLCNativeContractAddress',
    EvmMultiCallContract = 'EvmMultiCallContract',
    GasPriceOracleContract = 'GasPriceOracleContract',
    ZksPaymasterContract = 'ZksPaymasterContract',
}

export enum ManagedAccountType {
    LP = 'LP',
}

export class Token {
    symbol: string;
    logo: string;
    contract: string | null | undefined;
    decimals: number;
    precision: number;
    priceInUsd: number;
    listingDate: string;
}