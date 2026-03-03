import { ClaimParams, CreateHTLCParams, LockParams, RefundParams } from "./params"
import { LockDetails } from "./lock"
import { AtomicResult, RecoveredSwapData } from "./atomic"
import type { TrainApiClient } from "../api/client"

export type BaseHTLCClientConfig = {
    apiClient: TrainApiClient
}

export interface IHTLCClient {
    getUserLockDetails(params: LockParams): Promise<LockDetails | null>
    getSolverLockDetails(params: LockParams, nodeUrls: string[]): Promise<LockDetails | null>
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

    async getSolverLockDetails(params: LockParams, nodeUrls: string[]): Promise<LockDetails | null> {
        const results = await Promise.all(
            nodeUrls.map(url => this._getSolverLockDetails(params, url))
        )

        const validResults = results.filter((r): r is LockDetails => r !== null)
        if (!validResults.length) return null

        const [first, ...rest] = validResults
        if (!rest.every(r => r.amount === first.amount && r.sender === first.sender && r.recipient === first.recipient && r.token === first.token && r.timelock === first.timelock)) {
            throw new Error('Lock details do not match across the provided nodes')
        }

        return first
    }

    abstract getUserLockDetails(params: LockParams): Promise<LockDetails | null>
    abstract _getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<LockDetails | null>
    abstract recoverSwap(txHash: string): Promise<RecoveredSwapData>
    abstract createHTLC(params: CreateHTLCParams): Promise<AtomicResult>
    abstract refund(params: RefundParams): Promise<string>
    abstract claim(params: ClaimParams): Promise<string>
}
