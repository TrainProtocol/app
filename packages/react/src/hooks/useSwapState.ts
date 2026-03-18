import { useSwapContext } from '../providers/SwapProvider'
import type { HTLCStatus, UserLockDetails, SolverLockDetails, HTLCFromApi } from '@train-protocol/sdk'

export interface UseSwapStateResult {
    status: HTLCStatus
    hashlock: string | null
    sourceDetails: UserLockDetails | null
    solverLockDetails: SolverLockDetails | null
    htlcFromApi: HTLCFromApi | null
    secretRevealed: boolean
    isTimelockExpired: boolean
    manualClaimRequired: boolean
    destRedeemTxId: string | null
    error: Error | null
    consensusVerifying: boolean
    consensusVerified: boolean
}

export function useSwapState(): UseSwapStateResult {
    const ctx = useSwapContext()

    return {
        status: ctx.status,
        hashlock: ctx.hashlock,
        sourceDetails: ctx.sourceDetails,
        solverLockDetails: ctx.solverLockDetails,
        htlcFromApi: ctx.htlcFromApi,
        secretRevealed: ctx.secretRevealed,
        isTimelockExpired: ctx.isTimelockExpired,
        manualClaimRequired: ctx.manualClaimRequired,
        destRedeemTxId: ctx.destRedeemTxId,
        error: ctx.error,
        consensusVerifying: ctx.consensusVerifying,
        consensusVerified: ctx.consensusVerified,
    }
}
