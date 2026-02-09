/** Lock status enum (EVM v3) */
export enum LockStatus {
    Pending = 0,
    Redeemed = 1,
    Refunded = 2
}

export type Commit = {
    sender?: string,
    srcReceiver?: string,
    /** Recipient address (EVM v3) */
    recipient?: string,
    timelock: number,
    amount: number,
    id?: string | undefined,
    hashlock: string | undefined,
    secret: bigint | undefined,
    claimed: number,
    ownership?: string,
    /** Token contract address (EVM v2+) - address(0) for native */
    token?: string,
    /** Reward amount (EVM v2+) */
    reward?: number,
    /** Reward timelock (EVM v2+) */
    rewardTimelock?: number,
    /** Index for hashlock-based contracts (EVM v2+) */
    index?: number,
    /** Lock status (EVM v3) - 0=Pending, 1=Redeemed, 2=Refunded */
    status?: LockStatus
}