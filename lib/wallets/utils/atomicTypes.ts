import { CreatePreHTLCParams, CommitmentParams, LockParams, RefundParams, ClaimParams, GetCommitsParams } from "@/Models/phtlc"
import { Commit } from "@/Models/phtlc/PHTLC"

// Common result types
export interface AtomicResult {
    hash: string
    commitId: string
}

export interface LockResult {
    hash: string
    result: any
}

// Base interface with core methods all chains implement
export interface BaseAtomicFunctions {
    createPreHTLC: (params: CreatePreHTLCParams) => Promise<AtomicResult | null | undefined>
    getDetails: (params: CommitmentParams) => Promise<Commit | null>
    refund: (params: RefundParams) => Promise<string | any | null>
    claim: (params: ClaimParams) => Promise<string | undefined>
}

// Chain-specific interfaces extend the base
export interface AtomicEVMFunctions extends BaseAtomicFunctions {
    createPreHTLC: (params: CreatePreHTLCParams) => Promise<AtomicResult>
    getDetails: (params: CommitmentParams) => Promise<Commit>
    secureGetDetails: (params: CommitmentParams) => Promise<Commit | null>
    addLock: (params: CommitmentParams & LockParams) => Promise<LockResult>
    refund: (params: RefundParams) => Promise<string>
    claim: (params: ClaimParams) => Promise<string>
}

export interface AtomicAztecFunctions extends BaseAtomicFunctions {
    createPreHTLC: (params: CreatePreHTLCParams) => Promise<AtomicResult>
    getDetails: (params: CommitmentParams) => Promise<Commit>
    addLock: (params: CommitmentParams & LockParams) => Promise<LockResult>
    refund: (params: RefundParams) => Promise<any>
    claim: (params: ClaimParams) => Promise<any>
}

export interface AtomicFuelFunctions extends BaseAtomicFunctions {
    createPreHTLC: (params: CreatePreHTLCParams) => Promise<AtomicResult>
    getDetails: (params: CommitmentParams) => Promise<any>
    addLockSig: (params: CommitmentParams & LockParams) => Promise<LockResult>
    refund: (params: RefundParams) => Promise<string>
    claim: (params: ClaimParams) => Promise<string>
}

export interface AtomicSVMFunctions extends BaseAtomicFunctions {
    createPreHTLC: (params: CreatePreHTLCParams) => Promise<AtomicResult | null | undefined>
    getDetails: (params: CommitmentParams) => Promise<any>
    addLock: (params: CommitmentParams & LockParams) => Promise<LockResult | null>
    refund: (params: RefundParams) => Promise<string | null>
    claim: (params: ClaimParams) => Promise<string | undefined>
}

export interface AtomicStarknetFunctions extends BaseAtomicFunctions {
    createPreHTLC: (params: CreatePreHTLCParams) => Promise<AtomicResult>
    getDetails: (params: CommitmentParams) => Promise<Commit>
    addLock: (params: CommitmentParams & LockParams) => Promise<LockResult>
    addLockSig: (params: CommitmentParams & LockParams) => Promise<LockResult>
    refund: (params: RefundParams) => Promise<string>
    claim: (params: ClaimParams) => Promise<string>
    getContracts: (params: GetCommitsParams) => Promise<any>
}

export interface AtomicTONFunctions extends BaseAtomicFunctions {
    createPreHTLC: (params: CreatePreHTLCParams) => Promise<AtomicResult | undefined>
    getDetails: (params: CommitmentParams) => Promise<Commit>
    addLock: (params: CommitmentParams & LockParams) => Promise<LockResult>
    refund: (params: RefundParams) => Promise<any>
    claim: (params: ClaimParams) => Promise<string>
}
