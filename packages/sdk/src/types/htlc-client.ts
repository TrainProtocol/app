import { RedeemSolverParams, UserLockParams, LockParams, RefundParams } from "./params"
import { UserLockDetails, SolverLockDetails } from "./lock"
import { AtomicResult, RecoveredSwapData } from "./atomic"
import type { TrainApiClient } from "../api/client"

export interface IHTLCClient {
    getUserLockDetails(params: LockParams): Promise<UserLockDetails | null>
    getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null>
    getSolverLockDetailsWithConsensus(params: LockParams, nodeUrls: string[], options?: ConsensusOptions & { prefetchedResult?: SolverLockDetails }): Promise<SolverLockDetails | null>
    recoverSwap(txHash: string): Promise<RecoveredSwapData>

    userLock(params: UserLockParams): Promise<AtomicResult>
    refund(params: RefundParams): Promise<string>
    redeemSolver(params: RedeemSolverParams): Promise<string>
}

export abstract class HTLCClient implements IHTLCClient {
    protected apiClient?: TrainApiClient
    protected consensusOptions: Required<ConsensusOptions> = { minQuorum: 2, batchSize: 3 }

    constructor(apiClient?: TrainApiClient) {
        this.apiClient = apiClient
    }

    revealSecret(solverId: string, hashlock: string, secret: string): Promise<void> {
        if (!this.apiClient) throw new Error('apiClient is required for revealSecret')
        return this.apiClient.revealSecret(solverId, hashlock, secret)
    }

    async getSolverLockDetailsWithConsensus(
        params: LockParams,
        nodeUrls: string[],
        options?: ConsensusOptions & { prefetchedResult?: SolverLockDetails }
    ): Promise<SolverLockDetails | null> {
        const minQuorum = options?.minQuorum ?? this.consensusOptions.minQuorum
        const batchSize = options?.batchSize ?? this.consensusOptions.batchSize
        const prefetchedResult = options?.prefetchedResult

        if (!nodeUrls.length && !prefetchedResult) return null

        const effectiveQuorum = Math.min(minQuorum, nodeUrls.length)

        // Skip nodeUrls[0] when prefetched — it already represents that node's result
        const urlsToQuery = prefetchedResult ? nodeUrls.slice(1) : nodeUrls

        // Partition urlsToQuery into batches
        const batches: string[][] = []
        for (let i = 0; i < urlsToQuery.length; i += batchSize) {
            batches.push(urlsToQuery.slice(i, i + batchSize))
        }

        const allValidResults: SolverLockDetails[] = prefetchedResult ? [prefetchedResult] : []
        let totalQueried = prefetchedResult ? 1 : 0
        let lastError: unknown = null

        // Prefetched alone satisfies quorum (e.g. Aztec minQuorum=1)
        if (allValidResults.length >= effectiveQuorum) {
            return allValidResults[0]
        }

        for (const batch of batches) {
            const results = await Promise.allSettled(
                batch.map(url => this.getSolverLockDetails(params, url))
            )

            totalQueried += batch.length

            const fulfilled = results.filter(
                (r): r is PromiseFulfilledResult<SolverLockDetails | null> => r.status === 'fulfilled'
            )
            const validResults = fulfilled.map(r => r.value).filter((r): r is SolverLockDetails => r !== null)

            allValidResults.push(...validResults)

            const batchError = results.find(
                (r): r is PromiseRejectedResult => r.status === 'rejected'
            )
            if (batchError) lastError = batchError.reason

            if (allValidResults.length >= effectiveQuorum) {
                const [first, ...rest] = allValidResults
                if (rest.length > 0 && !rest.every(r =>
                    String(r.amount) === String(first.amount) &&
                    r.sender === first.sender &&
                    r.recipient === first.recipient &&
                    r.token === first.token &&
                    r.timelock === first.timelock &&
                    r.status === first.status
                )) {
                    throw new Error('Lock details do not match across the provided nodes')
                }
                return first
            }
        }

        // All batches exhausted
        if (allValidResults.length === 0) {
            if (lastError) throw lastError
            return null
        }

        throw new Error(
            `Insufficient node agreement: ${allValidResults.length} of ${totalQueried} nodes returned results, need at least ${effectiveQuorum}`
        )
    }

    abstract getUserLockDetails(params: LockParams): Promise<UserLockDetails | null>
    abstract getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null>
    abstract recoverSwap(txHash: string): Promise<RecoveredSwapData>
    abstract userLock(params: UserLockParams): Promise<AtomicResult>
    abstract refund(params: RefundParams): Promise<string>
    abstract redeemSolver(params: RedeemSolverParams): Promise<string>
}

export interface ConsensusOptions {
    minQuorum?: number
    batchSize?: number
}