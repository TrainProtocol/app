/** Lock status enum (EVM v3) */
export enum LockStatus {
    Pending = 0,
    Redeemed = 1,
    Refunded = 2
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
}