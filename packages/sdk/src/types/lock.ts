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
    id?: string | undefined,
    hashlock: string | undefined,
    secret: bigint | undefined,
    claimed: number,
    ownership?: string,
    token?: string,
    reward?: number,
    rewardTimelock?: number,
    index?: number,
    status?: LockStatus,
    rewardRecipient?: string,
    rewardToken?: string,
    userData?: string,
    blockTimestamp?: number,
}
