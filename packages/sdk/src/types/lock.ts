export type BaseLockDetails = {
    hashlock: string
    secret: bigint;
    amount: number;
    /** Exact on-chain amount in base units. Required for irreversible safety checks. */
    amountInBaseUnits?: bigint;
    sender: string;
    timelock: number;
    status: LockStatus;
    recipient: string;
    token: string;
}

export type Reward = {
    reward?: number;
    rewardToken?: string;
    rewardRecipient?: string;
    rewardTimelock?: number;
}

export type DestinationData = {
    dstChain?: string;
    dstAddress?: string;
    dstAmount?: bigint;
    dstToken?: string;
}

export type EventDerivedData = Reward & DestinationData & {
    userData?: string;
    solverData?: string
}

export type UserLockDetails = BaseLockDetails & EventDerivedData & {
    blockTimestamp?: number
}

export type SolverLockDetails = BaseLockDetails & Reward & {
    index: number
}

export enum LockStatus {
    Empty,
    Pending,
    Refunded,
    Redeemed
}

export type TransactionInfo = {
    hash: string
    status: TransactionStatus
    blockNumber?: string
    blockTimestamp?: number
}

export enum TransactionStatus {
    Pending = 'pending',
    Confirmed = 'confirmed',
    Failed = 'failed',
}
