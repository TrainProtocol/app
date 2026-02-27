import { ClaimParams, CreateHTLCParams, LockParams, RefundParams } from "./params"
import { LockDetails } from "./lock"
import { AtomicResult, RecoveredSwapData } from "./atomic"

export interface IHTLCClient {
    getUserLockDetails(params: LockParams): Promise<LockDetails | null>
    getSolverLockDetails(params: LockParams): Promise<LockDetails | null>
    secureGetDetails(params: LockParams, nodeUrls: string[]): Promise<LockDetails | null>
    recoverSwap(txHash: string): Promise<RecoveredSwapData>

    createHTLC(params: CreateHTLCParams): Promise<AtomicResult>
    refund(params: RefundParams): Promise<string>
    claim(params: ClaimParams): Promise<string>
}