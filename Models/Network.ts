
export enum NetworkType {
    EVM = "evm",
    Starknet = "starknet",
    Solana = "solana",
    Cosmos = "cosmos",
    StarkEx = "starkex",
    ZkSyncLite = "zksynclite",
    TON = 'ton',
    Fuel = 'fuel',
}

export class Network {
    name: string;
    display_name: string;
    logo: string;
    chain_id: string | null;
    // type: NetworkType;
    group: string
    transaction_explorer_template: string;
    account_explorer_template: string;
    tokens: Token[]
    native_token: Token
    listing_date: string;
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
    managed_accounts: [
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
    price_in_usd: number;
    precision: number;
    listing_date: string;
}