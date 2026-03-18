import { RedeemSolverParams, UserLockParams, LockParams, RefundParams } from "./params"
import { LockDetails, UserLockDetails, SolverLockDetails } from "./lock"
import { AtomicResult, RecoveredSwapData } from "./atomic"

export interface IHTLCClient {
    getUserLockDetails(params: LockParams): Promise<UserLockDetails | null>
    getSolverLockDetails(params: LockParams, nodeUrls: string[]): Promise<SolverLockDetails | null>
    recoverSwap(txHash: string): Promise<RecoveredSwapData>

    userLock(params: UserLockParams): Promise<AtomicResult>
    refund(params: RefundParams): Promise<string>
    redeemSolver(params: RedeemSolverParams): Promise<string>
}

export abstract class HTLCClient implements IHTLCClient {
    constructor() {}

    async getSolverLockDetails(params: LockParams, nodeUrls: string[]): Promise<SolverLockDetails | null> {
        console.log('[HTLCClient.getSolverLockDetails] nodeUrls:', nodeUrls, 'params:', { id: params.id, contractAddress: params.contractAddress, chainId: params.chainId, type: params.type })
        if (nodeUrls.length === 0) {
            console.warn('[HTLCClient.getSolverLockDetails] nodeUrls is EMPTY — cannot poll solver lock')
            return null
        }
        const results = await Promise.all(
            nodeUrls.map(url => this._getSolverLockDetails(params, url))
        )

        const validResults = results.filter((r): r is SolverLockDetails => r !== null)
        console.log('[HTLCClient.getSolverLockDetails] validResults:', validResults.length)
        if (!validResults.length) return null

        const [first, ...rest] = validResults
        if (!rest.every(r => r.amount === first.amount && r.sender === first.sender && r.recipient === first.recipient && r.token === first.token && r.timelock === first.timelock)) {
            throw new Error('Lock details do not match across the provided nodes')
        }

        return first
    }

    /**
     * Template method for solver lock retrieval.
     * Default implementation uses getSolverLockCount + getSolverLockByIndex.
     * Subclasses implement those two abstract methods instead of _getSolverLockDetails.
     */
    async _getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        const count = await this.getSolverLockCount(params, nodeUrl)
        if (count === 0) return null

        for (let i = 1; i <= count; i++) {
            const lock = await this.getSolverLockByIndex(params, i, nodeUrl)
            if (!lock) continue
            if (params.solverAddress && lock.sender?.toLowerCase() !== params.solverAddress.toLowerCase()) continue
            return lock
        }

        return null
    }

    abstract getUserLockDetails(params: LockParams): Promise<UserLockDetails | null>
    abstract getSolverLockCount(params: LockParams, nodeUrl: string): Promise<number>
    abstract getSolverLockByIndex(params: LockParams, index: number, nodeUrl: string): Promise<SolverLockDetails | null>
    abstract recoverSwap(txHash: string): Promise<RecoveredSwapData>
    abstract userLock(params: UserLockParams): Promise<AtomicResult>
    abstract refund(params: RefundParams): Promise<string>
    abstract redeemSolver(params: RedeemSolverParams): Promise<string>
}
