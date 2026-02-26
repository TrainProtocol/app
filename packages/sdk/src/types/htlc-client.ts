import { ClaimParams, CreateHTLCParams, LockParams, RefundParams } from "./params"
import { LockDetails } from "./lock"
import { AtomicResult, RecoveredSwapData } from "./atomic"
import { Network } from "./network"
import { ChainFeeConfig } from "@/evm"

export interface IHTLCClient {
    getUserLockDetails(params: LockParams): Promise<LockDetails | null>
    getSolverLockDetails(params: LockParams): Promise<LockDetails | null>
    secureGetDetails(params: LockParams, nodeUrls: string[], network: Network, feeConfig?: ChainFeeConfig): Promise<LockDetails | null>
    recoverSwap(txHash: `0x${string}`): Promise<RecoveredSwapData>

    createHTLC(params: CreateHTLCParams & { hashlock: string; nonce: number }): Promise<AtomicResult>
    refund(params: RefundParams): Promise<string>
    claim(params: ClaimParams): Promise<string>
}