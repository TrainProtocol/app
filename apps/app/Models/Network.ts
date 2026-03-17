// Re-exported from @train-protocol/sdk — single source of truth
export {
    NetworkContractType,
    Network,
    Token,
    getNativeToken,
} from '@train-protocol/sdk'
export type {
    NetworkTypeInfo,
    NetworkNode,
    NetworkContract,
    ExplorerUrlTemplate,
} from '@train-protocol/sdk'

export enum NetworkTypes {
    EVM = "eip155",
    Solana = "solana",
    Starknet = "starknet",
    Aztec = "aztec",
    TON = "ton",
}