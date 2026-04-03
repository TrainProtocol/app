import { useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from 'react'
import { HTLCStatus, TERMINAL_STATUSES } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useUserLockPolling } from '../internal/useUserLockPolling'
import { useSolverLockPolling } from '../internal/useSolverLockPolling'
import { useOrderStream } from '../internal/useOrderStream'
import { useDerivedSwapState, type DerivedSwapState } from '../internal/useDerivedSwapState'
import { parseCaip2Id } from '../internal/branded'
import { TrainError, TrainErrorCode } from '../types'

/**
 * Main hook for monitoring an active swap lifecycle.
 *
 * Given a hashlock, it reads the persisted swap from the store, initializes
 * in-memory config/flags, starts polling (source chain, destination chain,
 * order stream), and returns all derived state.
 *
 * Usage:
 * ```tsx
 * const progress = useSwapProgress('0xabc...')
 * // progress.status, progress.sourceDetails, progress.consensusVerified, etc.
 * ```
 *
 * When hashlock is null/undefined, polling is inactive and empty state is returned.
 * On unmount (or hashlock change), ephemeral state is cleaned up.
 */
export function useSwapProgress(hashlock: string | null | undefined): DerivedSwapState {
    const hl = hashlock ?? null
    const { config } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()

    // Read swap config for this hashlock
    const swapConfig = useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => (store && hl) ? store.getState().swapConfigs[hl] ?? null : null,
        () => null,
    )

    // Subscribe on mount, unsubscribe on unmount.
    // First subscriber hydrates config from persisted data; last unsubscribe cleans up ephemeral state.
    useEffect(() => {
        if (!hl || !store) return
        store.getState().subscribe(hl)
        return () => store.getState().unsubscribe(hl)
    }, [hl, store])

    // Derived state (status, secretRevealed, manualClaimRequired, etc.)
    const derived = useDerivedSwapState(store, hl)

    // Whether polling should be active
    const isActive = !!swapConfig?.hashlock && !TERMINAL_STATUSES.has(derived.status)

    // Source chain polling params — derive chainId from CAIP-2 ID
    const userLockParams = useMemo(() => {
        if (!swapConfig?.hashlock || !swapConfig?.srcContract) return null
        const chainId = swapConfig.origin === 'created'
            ? swapConfig.chainId
            : parseCaip2Id(swapConfig.sourceNetwork).reference
        return {
            id: swapConfig.hashlock,
            chainId,
            contractAddress: swapConfig.srcContract,
            txId: swapConfig.txId ?? undefined,
        }
    }, [swapConfig?.hashlock, swapConfig?.srcContract, swapConfig?.origin, swapConfig?.sourceNetwork, swapConfig?.txId])

    // Destination chain polling params — only available for created/hydrated swaps with destContract
    const solverLockParams = useMemo(() => {
        if (!swapConfig?.hashlock) return null
        const destContract = swapConfig.origin !== 'recovered'
            ? swapConfig.destContract
            : undefined  // recovered: no destContract
        if (!destContract) return null

        const destChainId = parseCaip2Id(swapConfig.destinationNetwork).reference
        const quote = swapConfig.origin === 'created' ? swapConfig.quote : null
        return {
            id: swapConfig.hashlock,
            chainId: destChainId,
            contractAddress: destContract,
            solverAddress: quote?.destinationSolverAddress,
        }
    }, [swapConfig?.hashlock, swapConfig?.origin, swapConfig?.destinationNetwork, derived.destinationToken])

    // Resolve destination chain node URLs for solver lock verification
    const destNodeUrls = useMemo(() => {
        if (!swapConfig?.destinationNetwork || !config.resolveNodeUrls) return []
        return config.resolveNodeUrls(swapConfig.destinationNetwork)
    }, [swapConfig?.destinationNetwork, config.resolveNodeUrls])

    // Create read-only HTLC clients for polling (via wallet adapter — no cast needed)
    const sourceReadClient = useMemo(() => {
        if (!swapConfig?.sourceNetwork) return null
        try {
            return walletCtx.createClient(swapConfig.sourceNetwork)
        } catch { return null }
    }, [swapConfig?.sourceNetwork, walletCtx])

    const destReadClient = useMemo(() => {
        if (!swapConfig?.destinationNetwork) return null
        try {
            return walletCtx.createClient(swapConfig.destinationNetwork)
        } catch { return null }
    }, [swapConfig?.destinationNetwork, walletCtx])

    const onConsensusFailed = useCallback((error: Error) => {
        if (!hl || !store) return
        const trainError = error instanceof TrainError
            ? error
            : new TrainError(error.message, TrainErrorCode.VerificationFailed, error)
        store.getState().setActiveSwapError(hl, trainError)
        config.onError?.(trainError)
    }, [hl, store, config])

    const onUserLockTxFailed = useCallback((tx: import('@train-protocol/sdk').TransactionInfo) => {
        if (!hl || !store) return
        const error = new TrainError(
            `User lock transaction ${tx.hash} failed on-chain`,
            TrainErrorCode.UserLockTransactionFailed,
        )
        store.getState().setActiveSwapError(hl, error)
        config.onError?.(error)
    }, [hl, store, config])

    // Activate polling hooks — data returned directly, not via store
    const sourceDetails = useUserLockPolling({
        client: sourceReadClient,
        params: userLockParams,
        enabled: isActive,
        onTransactionFailed: onUserLockTxFailed,
    })

    const { solverLockDetails, consensusPhase } = useSolverLockPolling({
        client: destReadClient,
        params: solverLockParams,
        hashlock: hl,
        nodeUrls: destNodeUrls,
        enabled: isActive && derived.status !== HTLCStatus.Initial,
        onConsensusFailed,
    })

    // Sync consensus phase to store flags (one-way, for useDerivedSwapState in other components)
    useEffect(() => {
        if (store && hl && consensusPhase !== 'none') {
            store.getState().setConsensusPhase(hl, consensusPhase)
        }
    }, [store, hl, consensusPhase])

    // Order streaming — only for swaps with a solverId
    const destRedeemTx = derived.htlcFromApi?.transactions?.find(
        (t: any) => t.type === 'HTLCRedeem' && t.network === swapConfig?.destinationNetwork
    )

    const solverId = swapConfig?.origin === 'created'
        ? swapConfig.solverId
        : swapConfig?.origin === 'hydrated'
            ? swapConfig.solverId ?? undefined
            : undefined  // recovered: no solverId

    const onOrderFailed = useCallback((reason: string) => {
        if (!hl) return
        const error = new TrainError(reason, TrainErrorCode.OrderFailed)
        store?.getState().setActiveSwapError(hl, error)
        config.onError?.(error)
    }, [store, hl, config])

    useOrderStream({
        baseUrl: config.baseUrl,
        solverId: solverId ?? undefined,
        hashlock: hl ?? undefined,
        enabled: !!swapConfig?.hashlock && !destRedeemTx,
        store,
        onFailed: onOrderFailed,
    })

    // Write-behind to persisted swap history (guard against redundant writes)
    const prevRef = useRef<{ status: HTLCStatus | null; destTxId: string | null; createdAt: number | null; timelock: number | null }>({
        status: null, destTxId: null, createdAt: null, timelock: null,
    })
    useEffect(() => {
        if (!store || !hl || !swapConfig?.hashlock) return
        const prev = prevRef.current
        const updates: Record<string, any> = {}
        if (derived.status !== prev.status) {
            updates.status = derived.status
            prev.status = derived.status
        }
        if (derived.destRedeemTxId && derived.destRedeemTxId !== prev.destTxId) {
            updates.destTxId = derived.destRedeemTxId
            prev.destTxId = derived.destRedeemTxId
        }
        if (sourceDetails?.blockTimestamp && sourceDetails.blockTimestamp !== prev.createdAt) {
            updates.createdAt = sourceDetails.blockTimestamp
            prev.createdAt = sourceDetails.blockTimestamp
        }
        if (sourceDetails?.timelock && sourceDetails.timelock !== prev.timelock) {
            updates.timelock = sourceDetails.timelock
            prev.timelock = sourceDetails.timelock
        }
        // sourceAddress and destinationAddress are static — write once
        if (swapConfig.sourceAddress && !prev.status) updates.sourceAddress = swapConfig.sourceAddress
        if (swapConfig.destinationAddress && !prev.status) updates.destinationAddress = swapConfig.destinationAddress
        if (Object.keys(updates).length > 0) {
            store.getState().updateSwap(hl, updates)
        }
    }, [store, hl, swapConfig?.hashlock, derived.status, derived.destRedeemTxId, sourceDetails?.blockTimestamp, sourceDetails?.timelock])

    return derived
}
