import { useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { resolveHTLCStatus, HTLCStatus, LockStatus } from '@train-protocol/sdk'
import type { Network, Token, UserLockDetails, SolverLockDetails, HTLCFromApi } from '@train-protocol/sdk'
import type { TrainError, SwapData } from '../types'
import type { LoginIdentity } from '../hooks/useLoginIdentityMismatch'
import type { SwapStore, SwapConfig, SwapFlags } from './store'
import { useNetworksContext } from '../providers/NetworksProvider'
import { resolveSwapTokens } from './resolveSwapTokens'
import { useTimelockExpiry } from './useTimelockExpiry'
import { trainQueryKeys } from './queryKeys'

const MANUAL_CLAIM_DELAY_MS = 3 * 60 * 1000

export interface DerivedSwapState {
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
    solver: string | null
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
    solver: null,
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
 * 3. sourceDetails & solverLockDetails from React Query cache (polling)
 * 4. networks from NetworksProvider (resolved Network/Token objects)
 *
 * This is the single place where raw data becomes the shape consumers expect.
 */
export function useDerivedSwapState(store: SwapStore | null, hashlock: string | null): DerivedSwapState {
    const queryClient = useQueryClient()
    const { networks } = useNetworksContext()

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

    // Read persisted swap data from store
    const swapData = useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => (store && hashlock) ? store.getState().swaps[hashlock] ?? null : null,
        () => null,
    ) as SwapData | null

    // Resolve Network and Token objects from persisted CAIP-2 IDs / symbols
    const { sourceToken, destinationToken } = useMemo(
        () => {
            const resolved = resolveSwapTokens(swapData ?? undefined, networks)
            return { sourceToken: resolved.sourceAsset, destinationToken: resolved.destinationAsset }
        },
        [swapData, networks],
    )

    const sourceNetwork = useMemo(
        () => swapData?.source ? networks.find(n => n.caip2Id.toUpperCase() === swapData.source.toUpperCase()) ?? null : null,
        [swapData?.source, networks],
    )

    const destinationNetwork = useMemo(
        () => swapData?.destination ? networks.find(n => n.caip2Id.toUpperCase() === swapData.destination.toUpperCase()) ?? null : null,
        [swapData?.destination, networks],
    )

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

        source: swapData?.source ?? null,
        destination: swapData?.destination ?? null,
        sourceAddress: swapData?.sourceAddress ?? null,
        destinationAddress: swapData?.destinationAddress ?? swapData?.address ?? null,
        requestedAmount: swapData?.requestedAmount ?? null,
        receiveAmount: swapData?.receiveAmount ?? null,
        solver: swapData?.solver ?? null,
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
}
