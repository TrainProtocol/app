import { useState, useEffect, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { resolveHTLCStatus, HTLCStatus, LockStatus } from '@train-protocol/sdk'
import type { UserLockDetails, SolverLockDetails, HTLCFromApi } from '@train-protocol/sdk'
import type { TrainError } from '../types'
import type { SwapStore, SwapConfig, SwapFlags } from './store'
import { useTimelockExpiry } from './useTimelockExpiry'
import { trainQueryKeys } from './queryKeys'

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
    error: TrainError | null
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

function deriveDestRedeemTxId(htlcFromApi: HTLCFromApi | null, destinationNetwork: string | undefined): string | null {
    const redeemTx = htlcFromApi?.transactions?.find(
        (t: any) => t.type === 'HTLCRedeem' && t.network === destinationNetwork
    )
    return redeemTx?.hash ?? null
}

/**
 * Hook that reads swap state from three sources and derives all computed state:
 * 1. swapFlags from the store
 * 2. sourceDetails & solverLockDetails from React Query cache
 * 3. orderData from the store
 *
 * This is the single place where raw data becomes the shape consumers expect.
 */
export function useDerivedSwapState(store: SwapStore | null, hashlock: string | null): DerivedSwapState {
    const queryClient = useQueryClient()

    // Read config from store
    const config = useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => (store && hashlock) ? store.getState().swapConfigs[hashlock] ?? null : null,
        () => null,
    ) as SwapConfig | null

    // Read flags from store
    const flags = useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => (store && hashlock) ? store.getState().swapFlags[hashlock] ?? null : null,
        () => null,
    ) as SwapFlags | null

    // Read order data from store
    const htlcFromApi = useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => (store && hashlock) ? store.getState().orderData[hashlock] ?? null : null,
        () => null,
    ) as HTLCFromApi | null

    // Read polled data from React Query cache
    const sourceDetails = (hashlock
        ? queryClient.getQueryData<UserLockDetails | null>(trainQueryKeys.userLock(hashlock))
        : null) ?? null

    const solverLockDetails = (hashlock
        ? queryClient.getQueryData<SolverLockDetails | null>(trainQueryKeys.solverLock(hashlock))
        : null) ?? null

    const isTimelockExpired = useTimelockExpiry(sourceDetails?.timelock)

    // Manual claim timer: fires after MANUAL_CLAIM_DELAY_MS from when source was redeemed
    const [manualClaimRequired, setManualClaimRequired] = useState(false)

    useEffect(() => {
        if (!flags?.manualClaimStartedAt) {
            setManualClaimRequired(false)
            return
        }

        const elapsed = Date.now() - flags.manualClaimStartedAt
        if (elapsed >= MANUAL_CLAIM_DELAY_MS) {
            setManualClaimRequired(true)
            return
        }

        setManualClaimRequired(false)
        const timer = setTimeout(() => setManualClaimRequired(true), MANUAL_CLAIM_DELAY_MS - elapsed)
        return () => clearTimeout(timer)
    }, [flags?.manualClaimStartedAt])

    // Track manual claim start: when source is redeemed but solver is not
    useEffect(() => {
        if (
            store &&
            hashlock &&
            flags &&
            sourceDetails?.status === LockStatus.Redeemed &&
            solverLockDetails &&
            solverLockDetails.status !== LockStatus.Redeemed &&
            !flags.manualClaimStartedAt
        ) {
            store.getState().setManualClaimStartedAt(hashlock, Date.now())
        }
    }, [store, hashlock, sourceDetails?.status, solverLockDetails?.status, flags?.manualClaimStartedAt])

    if (!config || !flags) return EMPTY_STATE

    const secretRevealed = flags.secretRevealedToApi || !!sourceDetails?.secret
    const destRedeemTxId = deriveDestRedeemTxId(htlcFromApi, config.destinationNetwork)

    const status = resolveHTLCStatus({
        sourceDetails: sourceDetails ?? undefined,
        solverLockDetails: solverLockDetails ?? undefined,
        timelockExpired: isTimelockExpired,
        secretRevealed,
        manualClaimRequired,
        destRedeemTxId: destRedeemTxId ?? undefined,
    })

    return {
        status,
        hashlock: config.hashlock,
        sourceDetails,
        solverLockDetails,
        htlcFromApi,
        secretRevealed,
        isTimelockExpired,
        manualClaimRequired,
        destRedeemTxId,
        error: flags.error,
        consensusVerifying: flags.consensusPhase === 'verifying',
        consensusVerified: flags.consensusPhase === 'verified',
    }
}
