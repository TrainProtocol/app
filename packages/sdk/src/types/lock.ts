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
    refundTo?: string;
    /**
     * Redeem-time payout curve, or null when the lock carries none and pays in full.
     * An unavailable field stays '' so an incomplete decoder cannot read as "no curve".
     */
    payoutCurve: string | null;
    /** Curve config as canonical 0x-prefixed bytes. */
    payoutCurveData: string;
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

/**
 * A solver lock is identified on-chain by `(hashlock, solver address)`. The solver
 * address is the lock's `sender`, so no separate identity field is carried here.
 */
export type SolverLockDetails = BaseLockDetails & Reward

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
