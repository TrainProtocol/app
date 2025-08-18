export type Commit = {
    sender?: string,
    srcReceiver?: string,
    timelock: number,
    amount: number,
    id?: string | undefined,
    hashlock: string | undefined,
    secret: bigint | undefined,
    claimed: number,
    ownership?: string
}