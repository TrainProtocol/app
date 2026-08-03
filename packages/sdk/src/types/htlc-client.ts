import { RedeemSolverParams, UserLockParams, LockParams, RefundParams } from "./params"
import { UserLockDetails, SolverLockDetails, TransactionInfo } from "./lock"
import { AtomicResult } from "./atomic"
import { Network } from "./network"

export interface IHTLCPublicClient {
    getUserLockDetails(params: LockParams): Promise<UserLockDetails | null>
    getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null>
    getSolverLockDetailsWithConsensus(params: LockParams, nodeUrls: string[], options?: ConsensusOptions & { prefetchedResult?: SolverLockDetails }): Promise<ConsensusResult | null>
    recoverSwap(txHash: string, network: Network): Promise<UserLockDetails>
    getTransaction(txHash: string): Promise<TransactionInfo | null>
}

/**
 * Open registry of chain-specific unsigned transaction request types.
 * Chain SDKs augment this via declaration merging:
 *
 *   declare module '@train-protocol/sdk' {
 *       interface HTLCTransactionRequestMap {
 *           eip155: EvmTransactionRequest
 *       }
 *   }
 *
 * Consumers can then reference the chain's request shape via
 * `TransactionRequestFor<'eip155'>` without importing from the chain package.
 */
export interface HTLCTransactionRequestMap {}

export type TransactionRequestFor<N extends string> = N extends keyof HTLCTransactionRequestMap
    ? HTLCTransactionRequestMap[N]
    : unknown

/**
 * Parameters accepted by `buildApproveTx` on chains with ERC20-style allowances
 * (EVM, Tron, Starknet). Chains without an allowance model (Solana, Aztec) do
 * not implement `buildApproveTx`.
 */
export interface BuildApproveTxParams {
    token: string
    spender: string
    amount: bigint
}

export interface IHTLCWalletClient<TTx = unknown> extends IHTLCPublicClient {
    userLock(params: UserLockParams): Promise<AtomicResult>
    refund(params: RefundParams): Promise<string>
    redeemSolver(params: RedeemSolverParams): Promise<string>
    /**
     * Builders return the chain's natural unsigned-transaction shape. Some chains
     * are sync (EVM/Tron/Starknet), some async (Solana/Aztec); Aztec's user-lock
     * builder returns an array (authwit + lock batch). The interface accepts all
     * shapes; concrete classes narrow.
     */
    buildUserLockTx(params: UserLockParams): TTx | TTx[] | Promise<TTx | TTx[]>
    buildRefundTx(params: RefundParams): TTx | Promise<TTx>
    buildRedeemSolverTx(params: RedeemSolverParams): TTx | Promise<TTx>
    /** Present only on chains with ERC20-style allowances. */
    buildApproveTx?(params: BuildApproveTxParams): TTx | Promise<TTx>
}

export abstract class HTLCPublicClient implements IHTLCPublicClient {
    protected consensusOptions: Required<ConsensusOptions> = { minQuorum: 2, batchSize: 3 }

    async getSolverLockDetailsWithConsensus(
        params: LockParams,
        nodeUrls: string[],
        options?: ConsensusOptions & { prefetchedResult?: SolverLockDetails }
    ): Promise<ConsensusResult | null> {
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
            return { details: allValidResults[0], agreedCount: allValidResults.length }
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
                    amountsMatch(r, first) &&
                    r.hashlock.toLowerCase() === first.hashlock.toLowerCase() &&
                    r.sender === first.sender &&
                    r.recipient === first.recipient &&
                    r.token === first.token &&
                    r.refundTo === first.refundTo &&
                    r.payoutCurve === first.payoutCurve &&
                    r.payoutCurveData === first.payoutCurveData &&
                    r.timelock === first.timelock &&
                    r.status === first.status
                )) {
                    throw new Error('Lock details do not match across the provided nodes')
                }
                return { details: first, agreedCount: allValidResults.length }
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
    abstract recoverSwap(txHash: string, network: Network): Promise<UserLockDetails>
    abstract getTransaction(txHash: string): Promise<TransactionInfo | null>
}

export interface ConsensusOptions {
    minQuorum?: number
    batchSize?: number
}

export interface ConsensusResult {
    details: SolverLockDetails
    agreedCount: number
}

function amountsMatch(left: SolverLockDetails, right: SolverLockDetails): boolean {
    if (left.amountInBaseUnits !== undefined || right.amountInBaseUnits !== undefined) {
        return left.amountInBaseUnits !== undefined &&
            right.amountInBaseUnits !== undefined &&
            left.amountInBaseUnits === right.amountInBaseUnits
    }
    return String(left.amount) === String(right.amount)
}
