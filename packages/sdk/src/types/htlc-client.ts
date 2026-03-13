import { RedeemSolverParams, UserLockParams, LockParams, RefundParams } from "./params"
import { LockDetails } from "./lock"
import { AtomicResult, RecoveredSwapData } from "./atomic"
import type { TrainApiClient } from "../api/client"

export type BaseHTLCClientConfig = {
    apiClient: TrainApiClient
}

export interface IHTLCClient {
    getUserLockDetails(params: LockParams): Promise<LockDetails | null>
    getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<LockDetails | null>
    getSolverLockDetailsWithConsensus(params: LockParams, nodeUrls: string[], options?: ConsensusOptions): Promise<LockDetails | null>
    recoverSwap(txHash: string): Promise<RecoveredSwapData>

    userLock(params: UserLockParams): Promise<AtomicResult>
    refund(params: RefundParams): Promise<string>
    redeemSolver(params: RedeemSolverParams): Promise<string>
    revealSecret(solverId: string, hashlock: string, secret: string): Promise<void>
}

export abstract class HTLCClient implements IHTLCClient {
    protected apiClient: TrainApiClient
    protected consensusOptions: ConsensusOptions = { minQuorum: 2 }

    constructor(apiClient: TrainApiClient) {
        this.apiClient = apiClient
    }

    revealSecret(solverId: string, hashlock: string, secret: string): Promise<void> {
        return this.apiClient.revealSecret(solverId, hashlock, secret)
    }

    async getSolverLockDetailsWithConsensus(
        params: LockParams,
        nodeUrls: string[],
        options?: ConsensusOptions
    ): Promise<LockDetails | null> {
        const { minQuorum = 2 } = { ...this.consensusOptions, ...options }

        if (!nodeUrls.length) return null

        const results = await Promise.allSettled(
            nodeUrls.map(url => this.getSolverLockDetails(params, url))
        )

        const fulfilled = results.filter(
            (r): r is PromiseFulfilledResult<LockDetails | null> => r.status === 'fulfilled'
        )
        const validResults = fulfilled.map(r => r.value).filter((r): r is LockDetails => r !== null)

        if (!validResults.length) {
            const firstError = results.find(
                (r): r is PromiseRejectedResult => r.status === 'rejected'
            )
            if (firstError && fulfilled.length === 0) throw firstError.reason
            return null
        }

        const effectiveQuorum = Math.min(minQuorum, nodeUrls.length)

        if (validResults.length < effectiveQuorum) {
            throw new Error(
                `Insufficient node agreement: ${validResults.length} of ${nodeUrls.length} nodes returned results, need at least ${effectiveQuorum}`
            )
        }

        const [first, ...rest] = validResults
        if (rest.length > 0 && !rest.every(r =>
            String(r.amount) === String(first.amount) &&
            r.sender === first.sender &&
            r.recipient === first.recipient &&
            r.token === first.token &&
            r.timelock === first.timelock
        )) {
            throw new Error('Lock details do not match across the provided nodes')
        }

        return first
    }

    abstract getUserLockDetails(params: LockParams): Promise<LockDetails | null>
    abstract getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<LockDetails | null>
    abstract recoverSwap(txHash: string): Promise<RecoveredSwapData>
    abstract userLock(params: UserLockParams): Promise<AtomicResult>
    abstract refund(params: RefundParams): Promise<string>
    abstract redeemSolver(params: RedeemSolverParams): Promise<string>
}

export interface ConsensusOptions {
    minQuorum?: number
}