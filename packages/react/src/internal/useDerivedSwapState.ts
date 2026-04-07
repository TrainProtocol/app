import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, skipToken } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { shallow } from 'zustand/shallow'
import { createStore } from 'zustand/vanilla'
import { resolveHTLCStatus, HTLCStatus, LockStatus } from '@train-protocol/sdk'
import type { Network, Token, UserLockDetails, SolverLockDetails, HTLCFromApi } from '@train-protocol/sdk'
import type { TrainError, SwapData } from '../types'
import type { LoginIdentity } from '../hooks/useLoginIdentityMismatch'
import type { SwapStore, SwapFlags, SwapStoreState } from './store'
import { useNetworksContext } from '../providers/NetworksProvider'
import { resolveSwapTokens } from './resolveSwapTokens'
import { useTimelockExpiry } from './useTimelockExpiry'
import { trainQueryKeys } from './queryKeys'

const MANUAL_CLAIM_DELAY_MS = 3 * 60 * 1000

/** Empty store used as a stable fallback so useStore is never called conditionally */
const EMPTY_STORE = createStore<SwapStoreState>()(() => ({
    swaps: {},
    swapFlags: {},
    orderData: {},
    swapSubscribers: {},
    addSwap: () => {},
    updateSwap: () => {},
    clearSwap: () => {},
    findSwapByTx: () => null,
    subscribe: () => {},
    unsubscribe: () => {},
    setSwapConfig: () => {},
    updateSwapFlags: () => {},
    setOrderData: () => {},
    getSwap: () => undefined,
    getSwapFlags: () => undefined,
    getOrderData: () => undefined,
} as SwapStoreState))

export interface DerivedSwapState {
    /** True while networks or store data are still loading */
    isLoading: boolean

    // Lifecycle
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

    // Persisted swap metadata
    source: string | null
    destination: string | null
    sourceAddress: string | null
    destinationAddress: string | null
    requestedAmount: string | null
    receiveAmount: string | null
    txId: string | null
    refundTxId: string | null
    srcContract: string | null
    destContract: string | null
    createdAt: number | null
    loginIdentity: LoginIdentity | null

    // Resolved objects
    sourceNetwork: Network | null
    destinationNetwork: Network | null
    sourceToken: Token | null
    destinationToken: Token | null
}

const EMPTY_STATE: DerivedSwapState = {
    isLoading: false,
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
    source: null,
    destination: null,
    sourceAddress: null,
    destinationAddress: null,
    requestedAmount: null,
    receiveAmount: null,
    txId: null,
    refundTxId: null,
    srcContract: null,
    destContract: null,
    createdAt: null,
    loginIdentity: null,
    sourceNetwork: null,
    destinationNetwork: null,
    sourceToken: null,
    destinationToken: null,
}

interface StoreSlice {
    flags: SwapFlags | null
    htlcFromApi: HTLCFromApi | null
    swapData: SwapData | null
}

const EMPTY_SLICE: StoreSlice = { flags: null, htlcFromApi: null, swapData: null }

function deriveDestRedeemTxId(htlcFromApi: HTLCFromApi | null, destinationNetwork: string | undefined): string | null {
    const redeemTx = htlcFromApi?.transactions?.find(
        (t: any) => t.type === 'HTLCRedeem' && t.network === destinationNetwork
    )
    return redeemTx?.hash ?? null
}

/**
 * Hook that reads swap state from multiple sources and derives all computed state:
 * 1. swapConfigs + swapFlags + orderData from the store (ephemeral)
 * 2. swaps[hashlock] from the store (persisted)
 * 3. sourceDetails & solverLockDetails from React Query cache (subscribed)
 * 4. networks from NetworksProvider (resolved Network/Token objects)
 *
 * This is the single place where raw data becomes the shape consumers expect.
 */
export function useDerivedSwapState(store: SwapStore | null, hashlock: string | null): DerivedSwapState {
    const { networks, networkMap, isLoading: networksLoading } = useNetworksContext()

    // Single store subscription with shallow comparison (fixes issue #4)
    // Always call useStore unconditionally to satisfy React's rules of hooks.
    // When store or hashlock is absent, we read from a static empty store.
    const storeSlice = useStore(store ?? EMPTY_STORE, (state) => {
        if (!hashlock) return EMPTY_SLICE
        return {
            flags: state.swapFlags[hashlock] ?? null,
            htlcFromApi: state.orderData[hashlock] ?? null,
            swapData: state.swaps[hashlock] ?? null,
        }
    }, shallow)
    const { flags, htlcFromApi, swapData } = storeSlice

    // Subscribe to React Query cache for polled data (fixes issue #3)
    // enabled: false means we never fetch — data is written by polling hooks.
    // useQuery subscribes to cache updates, unlike getQueryData which is point-in-time.
    const { data: sourceDetails = null } = useQuery<UserLockDetails | null>({
        queryKey: trainQueryKeys.userLock(hashlock ?? ''),
        queryFn: skipToken,
    })

    const { data: solverLockDetails = null } = useQuery<SolverLockDetails | null>({
        queryKey: trainQueryKeys.solverLock(hashlock ?? ''),
        queryFn: skipToken,
    })

    // Resolve Network and Token objects (uses networkMap for O(1) lookups)
    const { sourceToken, destinationToken } = useMemo(
        () => {
            const resolved = resolveSwapTokens(swapData ?? undefined, networkMap)
            return { sourceToken: resolved.sourceAsset, destinationToken: resolved.destinationAsset }
        },
        [swapData, networks],
    )

    // O(1) network lookups via map (fixes issue #11)
    const sourceNetwork = useMemo(
        () => swapData?.source ? (networkMap.get(swapData.source) ?? null) : null,
        [swapData?.source, networks],
    )

    const destinationNetwork = useMemo(
        () => swapData?.destination ? (networkMap.get(swapData.destination) ?? null) : null,
        [swapData?.destination, networks],
    )

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
            hashlock &&
            flags &&
            sourceDetails?.status === LockStatus.Redeemed &&
            solverLockDetails &&
            solverLockDetails.status !== LockStatus.Redeemed &&
            !flags.manualClaimStartedAt
        ) {
            store?.getState().updateSwapFlags(hashlock, { manualClaimStartedAt: Date.now() })
        }
    }, [store, hashlock, sourceDetails?.status, solverLockDetails?.status, flags?.manualClaimStartedAt])

    // Memoize the return value to prevent unnecessary re-renders (fixes issue #5)
    return useMemo<DerivedSwapState>(() => {
        // Loading: hashlock provided but store data or networks not ready yet
        if (hashlock && (!swapData || !flags || networksLoading)) {
            return { ...EMPTY_STATE, isLoading: true, hashlock }
        }
        if (!swapData || !flags) return EMPTY_STATE

        const secretRevealed = flags.secretRevealedToApi || !!sourceDetails?.secret
        const destRedeemTxId = deriveDestRedeemTxId(htlcFromApi, swapData.destination)

        const status = resolveHTLCStatus({
            sourceDetails: sourceDetails ?? undefined,
            solverLockDetails: solverLockDetails ?? undefined,
            timelockExpired: isTimelockExpired,
            secretRevealed,
            manualClaimRequired,
            destRedeemTxId: destRedeemTxId ?? undefined,
        })
        return {
            isLoading: false,
            status,
            hashlock: swapData.hashlock ?? hashlock,
            sourceDetails: sourceDetails ?? null,
            solverLockDetails: solverLockDetails ?? null,
            htlcFromApi,
            secretRevealed,
            isTimelockExpired,
            manualClaimRequired,
            destRedeemTxId,
            error: flags.error,
            consensusVerifying: flags.consensusPhase === 'verifying',
            consensusVerified: flags.consensusPhase === 'verified',

            source: swapData?.source ?? null,
            destination: swapData?.destination ?? null,
            sourceAddress: swapData?.sourceAddress ?? null,
            destinationAddress: swapData?.destinationAddress ?? swapData?.address ?? null,
            requestedAmount: swapData?.requestedAmount ?? null,
            receiveAmount: swapData?.receiveAmount ?? null,
            txId: swapData?.txId ?? null,
            refundTxId: swapData?.refundTxId ?? null,
            srcContract: swapData?.srcContract ?? null,
            destContract: swapData?.destContract ?? null,
            createdAt: swapData?.createdAt ?? null,
            loginIdentity: swapData?.loginIdentity ?? null,

            sourceNetwork,
            destinationNetwork,
            sourceToken,
            destinationToken,
        }
    }, [
        hashlock, networksLoading,
        flags, sourceDetails, solverLockDetails, htlcFromApi,
        isTimelockExpired, manualClaimRequired, swapData,
        sourceNetwork, destinationNetwork, sourceToken, destinationToken,
    ])
}
