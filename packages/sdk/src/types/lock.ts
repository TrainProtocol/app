export enum LockStatus {
    Empty,
    Pending,
    Refunded,
    Redeemed
}

export type LockDetails = {
    sender?: string,
    srcReceiver?: string,
    recipient?: string,
    timelock: number,
    amount: number,
    dstAmount?: number,
    hashlock: string | undefined,
    secret: bigint | undefined,
    ownership?: string,
    token?: string,
    reward?: number,
    rewardTimelock?: number,
    index?: number,
    status?: LockStatus,
    rewardRecipient?: string,
    rewardToken?: string,
    userData?: string
}

export enum TransactionStatus {
    Pending = 'pending',
    Confirmed = 'confirmed',
    Failed = 'failed',
}

export type TransactionInfo = {
    hash: string
    status: TransactionStatus
    blockNumber?: string
}
