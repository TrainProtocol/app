import { ClaimParams, CreateHTLCParams, LockParams, RefundParams } from "./params"
import { LockDetails } from "./lock"
import { AtomicResult, RecoveredSwapData } from "./atomic"
import type { TrainApiClient } from "../api/client"

export type BaseHTLCClientConfig = {
    apiClient: TrainApiClient
}

export interface IHTLCClient {
    getUserLockDetails(params: LockParams): Promise<LockDetails | null>
    getSolverLockDetails(params: LockParams): Promise<LockDetails | null>
    secureGetDetails(params: LockParams, nodeUrls: string[]): Promise<LockDetails | null>
    recoverSwap(txHash: string): Promise<RecoveredSwapData>

    createHTLC(params: CreateHTLCParams): Promise<AtomicResult>
    refund(params: RefundParams): Promise<string>
    claim(params: ClaimParams): Promise<string>
    revealSecret(solverId: string, hashlock: string, secret: string): Promise<void>
}

export abstract class HTLCClient implements IHTLCClient {
    protected apiClient: TrainApiClient

    constructor(apiClient: TrainApiClient) {
        this.apiClient = apiClient
    }

    revealSecret(solverId: string, hashlock: string, secret: string): Promise<void> {
        return this.apiClient.revealSecret(solverId, hashlock, secret)
    }

    abstract getUserLockDetails(params: LockParams): Promise<LockDetails | null>
    abstract getSolverLockDetails(params: LockParams): Promise<LockDetails | null>
    abstract secureGetDetails(params: LockParams, nodeUrls: string[]): Promise<LockDetails | null>
    abstract recoverSwap(txHash: string): Promise<RecoveredSwapData>
    abstract createHTLC(params: CreateHTLCParams): Promise<AtomicResult>
    abstract refund(params: RefundParams): Promise<string>
    abstract claim(params: ClaimParams): Promise<string>
}
