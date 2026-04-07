import { Token } from './network'

export type UserLockParams = {
    sourceChain: string
    destinationChain: string
    amount: string
    destinationAmount: string
    sourceAsset: Token
    destinationAsset: Token
    srcSolverAddress: string
    destSolverAddress: string
    atomicContract: string
    sourceAddress: string
    destinationAddress: string
    chainId?: string | null
    solverData?: string
    quoteExpiry: number
    rewardToken?: string
    rewardRecipient?: string
    rewardAmount?: string
    rewardTimelockDelta?: number
    timelockDelta: number
    hashlock: string
    nonce: number
}

export type LockParams = {
    id: string,
    chainId: string | null,
    contractAddress: string,
    index?: number,
    txId?: string,
    decimals: number,
    solverAddress?: string,
}

export type RefundParams = {
    chainId: string | null,
    contractAddress: string,
    id: string,
    hashlock?: string | undefined,
    sourceAsset: Token,
    index?: number,
}

export type RedeemSolverParams = {
    chainId: string | null,
    contractAddress: string,
    id: string,
    secret: string | bigint,
    sourceAsset: Token,
    destinationAddress: string,
    destinationAsset: Token,
    index?: number,
}
