export enum LockStatus {
    Empty,
    Pending,
    Refunded,
    Redeemed
}

type BaseLockDetails = {
    timelock: number,
    amount: number,
    hashlock: string | undefined,
    status?: LockStatus,
}

export type UserLockDetails = BaseLockDetails & {
    sender?: string,
    recipient?: string,
    token?: string,
    userData?: string,
    blockTimestamp?: number,
    secret?: bigint,
    dstAmount?: string,
}

export type SolverLockDetails = BaseLockDetails & {
    sender?: string,
    recipient?: string,
    token?: string,
    index: number,
    reward?: number,
    rewardTimelock?: number,
    rewardRecipient?: string,
    rewardToken?: string,
    secret?: bigint,
}

/** Backward-compatible union type */
export type LockDetails = UserLockDetails | SolverLockDetails
export enum TransactionStatus {
    Pending = 'pending',
    Confirmed = 'confirmed',
    Failed = 'failed',
}

export type TransactionInfo = {
    hash: string
    status: TransactionStatus
    blockNumber?: string
    blockTimestamp?: number
}
