// Re-exported from @train-protocol/sdk — single source of truth
import {
    Token,
    Network
} from '@train-protocol/sdk'
export {
    getNativeToken,
    Network,
    Token
} from '@train-protocol/sdk'
export type {
    ExplorerUrlTemplate,
} from '@train-protocol/sdk'

export enum NetworkTypes {
    EVM = "eip155",
    Solana = "solana",
    Starknet = "starknet",
    Aztec = "aztec",
    TON = "ton",
}

export class ExtendedNetwork extends Network {
    nodes: NetworkNode[];
    contracts: NetworkContract[];
    tokens: ExtendedToken[]
}


export type NetworkNode = {
    providerName: string;
    url: string;
}

export enum NetworkContractType {
    Train = "Train",
    Multicall = "Multicall",
}

export type NetworkContract = {
    type: NetworkContractType;
    address: string;
}

export class ExtendedToken extends Token {
    priceInUsd?: number;
}