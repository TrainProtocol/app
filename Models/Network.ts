
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
    displayName: string;
    logo: string;
    chainId: string | null;
    group: NetworkGroup
    transactionExplorerTemplate: string;
    accountExplorerTemplate: string;
    tokens: Token[]
    nativeToken: Token;
    get type(): NetworkType {
        return NETWORK_GROUP_TYPES[this.group];
    }
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

const NETWORK_GROUP_TYPES = {
    EVMEthereumLegacy: NetworkType.EVM,
    EVMEthereumEip1559: NetworkType.EVM,
    EVMArbitrumLegacy: NetworkType.EVM,
    EVMArbitrumEip1559: NetworkType.EVM,
    EVMOptimismEip1559: NetworkType.EVM,
    EVMOptimismLegacy: NetworkType.EVM,
    EVMPolygonLegacy: NetworkType.EVM,
    EVMPolygonEip1559: NetworkType.EVM,
    Loopring: NetworkType.EVM,

    ImmutableX: NetworkType.EVM,
    Brine: NetworkType.EVM,
    RhinoFi: NetworkType.EVM,
    Aptos: NetworkType.EVM,

    Fuel: NetworkType.Fuel,
    Solana: NetworkType.Solana,
    Starknet: NetworkType.Starknet,
    StarknetParadex: NetworkType.Starknet,

    Ton: NetworkType.TON,
    Tron: NetworkType.TON,
    Zksync: NetworkType.ZkSyncLite,

    Zkspace: NetworkType.ZkSyncLite,
    ZksyncEraPaymaster: NetworkType.ZkSyncLite,

    Osmosis: NetworkType.Cosmos,
}

export enum NetworkGroup {
    EVMEthereumLegacy = 'EVMEthereumLegacy',
    EVMEthereumEip1559 = 'EVMEthereumEip1559',
    EVMArbitrumLegacy = 'EVMArbitrumLegacy',
    EVMArbitrumEip1559 = 'EVMArbitrumEip1559',
    EVMOptimismEip1559 = 'EVMOptimismEip1559',
    EVMOptimismLegacy = 'EVMOptimismLegacy',
    EVMPolygonLegacy = 'EVMPolygonLegacy',
    EVMPolygonEip1559 = 'EVMPolygonEip1559',
    Solana = 'Solana',
    Starknet = 'Starknet',

}