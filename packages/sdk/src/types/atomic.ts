export interface AtomicResult {
    hash: string
    hashlock: string
    nonce?: number
}

export interface RecoveredSwapData {
    hashlock: string
    sender: string
    recipient: string
    srcChain: string
    dstChain: string
    token: string
    amount: bigint
    dstAddress: string
    dstAmount: bigint
    dstToken: string
    srcContract: string
}
