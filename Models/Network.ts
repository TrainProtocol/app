
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
    group: NetworkGroup
    transaction_explorer_template: string;
    account_explorer_template: string;
    tokens: Token[]
    native_token: Token;
    get type(): NetworkType {
        return NETWORK_GROUP_TYPES[this.group];
    }
    listing_date: string;
    is_testnet: boolean
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
    precision: number;
    price_in_usd: number;
    listing_date: string;
}

const NETWORK_GROUP_TYPES = {
    EVM_LEGACY: NetworkType.EVM,
    EVM_EIP1559: NetworkType.EVM,
    EVM_ARBITRUM_LEGACY: NetworkType.EVM,
    EVM_ARBITRUM_EIP1559: NetworkType.EVM,
    EVM_OPTIMISM_EIP1559: NetworkType.EVM,
    EVM_OPTIMISM_LEGACY: NetworkType.EVM,
    EVM_POLYGON_LEGACY: NetworkType.EVM,
    EVM_POLYGON_EIP1559: NetworkType.EVM,
    LOOPRING: NetworkType.EVM,

    IMMUTABLEX: NetworkType.EVM,
    BRINE: NetworkType.EVM,
    RHINOFI: NetworkType.EVM,
    APTOS: NetworkType.EVM,

    FUEL: NetworkType.Fuel,
    SOLANA: NetworkType.Solana,
    STARKNET: NetworkType.Starknet,
    STARKNET_PARADEX: NetworkType.Starknet,

    TON: NetworkType.TON,
    TRON: NetworkType.TON,
    ZKSYNC: NetworkType.ZkSyncLite,

    ZKSPACE: NetworkType.ZkSyncLite,
    ZKSYNC_ERA_PAYMASTER: NetworkType.ZkSyncLite,

    OSMOSIS: NetworkType.Cosmos,
}

export enum NetworkGroup {
    EVM_LEGACY = "EVM_LEGACY",
    EVM_EIP1559 = "EVM_EIP1559",
    EVM_ARBITRUM_LEGACY = "EVM_ARBITRUM_LEGACY",
    EVM_ARBITRUM_EIP1559 = "EVM_ARBITRUM_EIP1559",
    EVM_OPTIMISM_EIP1559 = "EVM_OPTIMISM_EIP1559",
    EVM_OPTIMISM_LEGACY = "EVM_OPTIMISM_LEGACY",
    EVM_POLYGON_LEGACY = "EVM_POLYGON_LEGACY",
    EVM_POLYGON_EIP1559 = "EVM_POLYGON_EIP1559",
    FUEL = "FUEL",
    IMMUTABLEX = "IMMUTABLEX",
    LOOPRING = "LOOPRING",
    OSMOSIS = "OSMOSIS",
    SOLANA = "SOLANA",
    STARKNET = "STARKNET",
    STARKNET_PARADEX = "STARKNET_PARADEX",
    TON = "TON",
    TRON = "TRON",
    ZKSYNC = "ZKSYNC",
    BRINE = "BRINE",
    RHINOFI = "RHINOFI",
    APTOS = "APTOS",
    ZKSPACE = "ZKSPACE",
    ZKSYNC_ERA_PAYMASTER = "ZKSYNC_ERA_PAYMASTER",
}