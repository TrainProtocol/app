// Re-exported from @train-protocol/sdk — single source of truth
import {
    Token as BaseToken,
    Network as BaseNetwork
} from '@train-protocol/sdk'
export {
    getNativeToken,
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

export class Network extends BaseNetwork {
    nodes: NetworkNode[];
    contracts: NetworkContract[];
    tokens: Token[]
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

export class Token extends BaseToken {
    priceInUsd?: number;
}