import { CreatePreHTLCParams, CommitmentParams, LockParams, RefundParams, ClaimParams, GetCommitsParams } from "@/Models/phtlc"
import { Commit } from "@/Models/phtlc/PHTLC"

// Common result types
export interface AtomicResult {
    hash: string
    commitId: string
    nonce?: number
}

export interface LockResult {
    hash: string
    result: any
}

// Base interface with core methods all chains implement
export interface BaseAtomicFunctions {
    createHTLC: (params: CreatePreHTLCParams) => Promise<AtomicResult | null | undefined>
    refund: (params: RefundParams) => Promise<string | any | null>
    claim: (params: ClaimParams) => Promise<string | undefined>
    getDetails: (params: CommitmentParams) => Promise<Commit | null>
    secureGetDetails?: (params: CommitmentParams) => Promise<Commit | null>
    getSolverLockDetails: (params: CommitmentParams) => Promise<Commit | null>
}
