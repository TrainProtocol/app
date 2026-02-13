import { CreateHTLCParams, LockParams, OldLockParams, RefundParams, ClaimParams, GetCommitsParams } from "@/Models/phtlc"
import { LockDetails } from "@/Models/phtlc/PHTLC"

// Common result types
export interface AtomicResult {
    hash: string
    hashlock: string
    nonce?: number
}

export interface LockResult {
    hash: string
    result: any
}

// Base interface with core methods all chains implement
export interface BaseAtomicFunctions {
    createHTLC: (params: CreateHTLCParams) => Promise<AtomicResult | null | undefined>
    refund: (params: RefundParams) => Promise<string | any | null>
    claim: (params: ClaimParams) => Promise<string | undefined>
    getUserLockDetails: (params: LockParams) => Promise<LockDetails | null>
    secureGetDetails?: (params: LockParams) => Promise<LockDetails | null>
    getSolverLockDetails: (params: LockParams) => Promise<LockDetails | null>
}
