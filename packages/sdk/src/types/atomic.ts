import { CreateHTLCParams, LockParams, RefundParams, ClaimParams } from './params'
import { LockDetails } from './lock'

export interface AtomicResult {
    hash: string
    hashlock: string
    nonce?: number
}

export interface LockResult {
    hash: string
    result: any
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

export interface BaseAtomicFunctions {
    createHTLC: (params: CreateHTLCParams) => Promise<AtomicResult | null | undefined>
    refund: (params: RefundParams) => Promise<string | any | null>
    claim: (params: ClaimParams) => Promise<string | undefined>
    getUserLockDetails: (params: LockParams) => Promise<LockDetails | null>
    secureGetDetails?: (params: LockParams) => Promise<LockDetails | null>
    getSolverLockDetails: (params: LockParams) => Promise<LockDetails | null>
    recoverSwap?: (txHash: string, chainId: string) => Promise<RecoveredSwapData>
}
