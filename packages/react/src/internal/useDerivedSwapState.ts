import { useState, useEffect, useSyncExternalStore } from 'react'
import { resolveHTLCStatus, HTLCStatus, LockStatus } from '@train-protocol/sdk'
import type { UserLockDetails, SolverLockDetails, HTLCFromApi } from '@train-protocol/sdk'
import type { SwapStore, ActiveSwapState } from './store'
import { useTimelockExpiry } from './useTimelockExpiry'

const MANUAL_CLAIM_DELAY_MS = 3 * 60 * 1000

export interface DerivedSwapState {
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

const EMPTY_STATE: DerivedSwapState = {
    status: HTLCStatus.Initial,
    hashlock: null,
    sourceDetails: null,
    solverLockDetails: null,
    htlcFromApi: null,
    secretRevealed: false,
    isTimelockExpired: false,
    manualClaimRequired: false,
    destRedeemTxId: null,
    error: null,
    consensusVerifying: false,
    consensusVerified: false,
}

function deriveDestRedeemTxId(activeSwap: ActiveSwapState): string | null {
    const redeemTx = activeSwap.htlcFromApi?.transactions?.find(
        (t: any) => t.type === 'HTLCRedeem' && t.network === activeSwap.destinationNetwork
    )
    return redeemTx?.hash ?? null
}

function deriveSecretRevealed(activeSwap: ActiveSwapState): boolean {
    return activeSwap.secretRevealedToApi || !!activeSwap.sourceDetails?.secret
}

/**
 * Hook that reads activeSwaps[hashlock] from the store and derives all computed state.
 * This is the single place where raw store data becomes the shape consumers expect.
 */
export function useDerivedSwapState(store: SwapStore | null, hashlock: string | null): DerivedSwapState {
    const activeSwap = useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => (store && hashlock) ? store.getState().activeSwaps[hashlock] ?? null : null,
        () => null,
    )

    const isTimelockExpired = useTimelockExpiry(activeSwap?.sourceDetails?.timelock)

    // Manual claim timer: fires after MANUAL_CLAIM_DELAY_MS from when source was redeemed
    const [manualClaimRequired, setManualClaimRequired] = useState(false)

    useEffect(() => {
        if (!activeSwap?.manualClaimStartedAt) {
            setManualClaimRequired(false)
            return
        }

        const elapsed = Date.now() - activeSwap.manualClaimStartedAt
        if (elapsed >= MANUAL_CLAIM_DELAY_MS) {
            setManualClaimRequired(true)
            return
        }

        setManualClaimRequired(false)
        const timer = setTimeout(() => setManualClaimRequired(true), MANUAL_CLAIM_DELAY_MS - elapsed)
        return () => clearTimeout(timer)
    }, [activeSwap?.manualClaimStartedAt])

    // Track manual claim start: when source is redeemed but solver is not
    useEffect(() => {
        if (
            store &&
            hashlock &&
            activeSwap &&
            activeSwap.sourceDetails?.status === LockStatus.Redeemed &&
            activeSwap.solverLockDetails &&
            activeSwap.solverLockDetails.status !== LockStatus.Redeemed &&
            !activeSwap.manualClaimStartedAt
        ) {
            store.getState().setManualClaimStartedAt(hashlock, Date.now())
        }
    }, [store, hashlock, activeSwap?.sourceDetails?.status, activeSwap?.solverLockDetails?.status, activeSwap?.manualClaimStartedAt])

    if (!activeSwap) return EMPTY_STATE

    const secretRevealed = deriveSecretRevealed(activeSwap)
    const destRedeemTxId = deriveDestRedeemTxId(activeSwap)

    const status = resolveHTLCStatus({
        sourceDetails: activeSwap.sourceDetails ?? undefined,
        solverLockDetails: activeSwap.solverLockDetails ?? undefined,
        timelockExpired: isTimelockExpired,
        secretRevealed,
        manualClaimRequired,
        destRedeemTxId: destRedeemTxId ?? undefined,
    })

    return {
        status,
        hashlock: activeSwap.hashlock,
        sourceDetails: activeSwap.sourceDetails,
        solverLockDetails: activeSwap.solverLockDetails,
        htlcFromApi: activeSwap.htlcFromApi,
        secretRevealed,
        isTimelockExpired,
        manualClaimRequired,
        destRedeemTxId,
        error: activeSwap.error,
        consensusVerifying: activeSwap.consensusPhase === 'verifying',
        consensusVerified: activeSwap.consensusPhase === 'verified',
    }
}
