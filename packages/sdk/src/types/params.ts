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
    payoutCurve: string
    /** Curve config bytes. Absent means none — the quote omits it when the curve takes no config. */
    payoutCurveData?: string
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
    txId?: string,
    decimals: number,
    /** Required to read a solver lock — it is the second half of the lock's on-chain key. */
    solverAddress?: string,
}

export type RefundParams = {
    chainId: string | null,
    contractAddress: string,
    id: string,
    hashlock?: string | undefined,
    sourceAsset: Token,
}

export type RedeemSolverParams = {
    chainId: string | null,
    contractAddress: string,
    id: string,
    secret: string | bigint,
    sourceAsset: Token,
    destinationAddress: string,
    destinationAsset: Token,
    /** Address of the solver whose lock is being redeemed — part of the lock's on-chain key. */
    solverAddress: string,
}
