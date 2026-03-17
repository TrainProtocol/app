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
    protected consensusOptions: ConsensusOptions

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
        const { minQuorum = 2, batchSize = 3 } = { ...this.consensusOptions, ...options }

        if (!nodeUrls.length) return null

        const effectiveQuorum = Math.min(minQuorum, nodeUrls.length)

        // Partition nodeUrls into batches
        const batches: string[][] = []
        for (let i = 0; i < nodeUrls.length; i += batchSize) {
            batches.push(nodeUrls.slice(i, i + batchSize))
        }

        let totalValid = 0
        let totalQueried = 0
        let lastError: unknown = null

        for (const batch of batches) {
            const results = await Promise.allSettled(
                batch.map(url => this.getSolverLockDetails(params, url))
            )

            totalQueried += batch.length

            const fulfilled = results.filter(
                (r): r is PromiseFulfilledResult<LockDetails | null> => r.status === 'fulfilled'
            )
            const validResults = fulfilled.map(r => r.value).filter((r): r is LockDetails => r !== null)

            totalValid += validResults.length

            const batchError = results.find(
                (r): r is PromiseRejectedResult => r.status === 'rejected'
            )
            if (batchError) lastError = batchError.reason

            if (validResults.length >= effectiveQuorum) {
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
        }

        // All batches exhausted
        if (totalValid === 0) {
            if (lastError) throw lastError
            return null
        }

        throw new Error(
            `Insufficient node agreement: ${totalValid} of ${totalQueried} nodes returned results, need at least ${effectiveQuorum}`
        )
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
    batchSize?: number
}