import { useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from 'react'
import { HTLCStatus, LockParams, TERMINAL_STATUSES } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useSwapActions } from '../internal/useSwapActions'
import { useUserLockPolling } from '../internal/useUserLockPolling'
import { useSolverLockPolling } from '../internal/useSolverLockPolling'
import { useOrderStream } from '../internal/useOrderStream'
import { useDerivedSwapState, type DerivedSwapState } from '../internal/useDerivedSwapState'
import { parseCaip2Id, caip2Id } from '../internal/branded'
import { TrainError, TrainErrorCode } from '../types'
import { useNetworksContext } from '../providers/NetworksProvider'

/**
 * Main hook for monitoring an active swap lifecycle.
 *
 * Given a hashlock, it reads the persisted swap from the store, starts
 * polling (source chain, destination chain, order stream), and returns
 * all derived state.
 *
 * When hashlock is null/undefined, polling is inactive and empty state is returned.
 * On unmount (or hashlock change), ephemeral state is cleaned up.
 */
export function useSwapProgress(hashlock: string | null | undefined): DerivedSwapState {
    const hl = hashlock ?? null
    const { config } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const actions = useSwapActions()
    const { networkMap } = useNetworksContext()

    // Read persisted swap data for this hashlock
    const swap = useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => { },
        () => (store && hl) ? store.getState().swaps[hl] ?? null : null,
        () => null,
    )

    // Subscribe on mount, unsubscribe on unmount.
    // First subscriber initializes flags from persisted data; last unsubscribe cleans up ephemeral state.
    useEffect(() => {
        if (!hl) return
        actions.subscribe(hl)
        return () => { actions.unsubscribe(hl) }
    }, [hl, actions])

    // Derived state (status, secretRevealed, manualClaimRequired, etc.)
    const derived = useDerivedSwapState(store, hl)

    // Whether polling should be active
    const isActive = useMemo(() => !!swap?.hashlock && !TERMINAL_STATUSES.has(derived.status), [swap?.hashlock, derived.status])

    // Source chain polling params
    const userLockParams: LockParams | null = useMemo(() => {
        if (!swap?.hashlock || !swap?.srcContract || !swap?.source) return null
        const sourceTokenDecimals = networkMap.get(swap.source)?.tokens.find(t => t.symbol == swap.source_asset)?.decimals
        if (!sourceTokenDecimals) return null
        return {
            id: swap.hashlock,
            chainId: parseCaip2Id(caip2Id(swap.source)).reference,
            decimals: sourceTokenDecimals,
            contractAddress: swap.srcContract,
            txId: swap.txId ?? undefined,
        }
    }, [swap?.hashlock, swap?.srcContract, swap?.source, swap?.txId, networkMap.size])

    // Destination chain polling params — requires destContract and solver
    const solverLockParams: LockParams | null = useMemo(() => {
        if (!swap?.hashlock || !swap?.destContract || !swap?.destination) return null
        const destTokenDecimals = networkMap.get(swap.destination)?.tokens.find(t => t.symbol == swap.destination_asset)?.decimals
        if (!destTokenDecimals) return null
        return {
            id: swap.hashlock,
            chainId: parseCaip2Id(caip2Id(swap.destination)).reference,
            decimals: destTokenDecimals,
            contractAddress: swap.destContract,
            solverAddress: swap.destinationSolverAddress,
        }
    }, [swap?.hashlock, swap?.destContract, swap?.destination, swap?.destTokenContract, swap?.destinationSolverAddress, networkMap.size])

    // Resolve destination chain node URLs for solver lock verification
    const destNodeUrls = useMemo(() => {
        if (!swap?.destination || !config.resolveNodeUrls) return []
        return config.resolveNodeUrls(caip2Id(swap.destination))
    }, [swap?.destination, config.resolveNodeUrls])

    // Create read-only HTLC clients for polling (via wallet adapter)
    const sourceReadClient = useMemo(() => {
        if (!swap?.source) return null
        try {
            return walletCtx.createClient(caip2Id(swap.source))
        } catch { return null }
    }, [swap?.source, walletCtx])

    const destReadClient = useMemo(() => {
        if (!swap?.destination) return null
        try {
            return walletCtx.createClient(caip2Id(swap.destination))
        } catch { return null }
    }, [swap?.destination, walletCtx])

    const onConsensusFailed = useCallback((error: Error) => {
        if (!hl) return
        const trainError = error instanceof TrainError
            ? error
            : new TrainError(error.message, TrainErrorCode.VerificationFailed, error)
        actions.updateSwapFlags(hl, { error: trainError })
        config.onError?.(trainError)
    }, [hl, actions, config])

    const onUserLockTxFailed = useCallback((tx: import('@train-protocol/sdk').TransactionInfo) => {
        if (!hl) return
        const error = new TrainError(
            `User lock transaction ${tx.hash} failed on-chain`,
            TrainErrorCode.UserLockTransactionFailed,
        )
        actions.updateSwapFlags(hl, { error })
        config.onError?.(error)
    }, [hl, actions, config])

    // Activate polling hooks — data returned directly, not via store
    const sourceDetails = useUserLockPolling({
        client: sourceReadClient,
        params: userLockParams,
        enabled: isActive,
        onTransactionFailed: onUserLockTxFailed,
    })

    const { consensusPhase } = useSolverLockPolling({
        client: destReadClient,
        params: solverLockParams,
        hashlock: hl,
        nodeUrls: destNodeUrls,
        enabled: isActive && derived.status !== HTLCStatus.Initial,
        onConsensusFailed,
    })

    // Sync consensus phase to store flags (one-way, for useDerivedSwapState in other components)
    useEffect(() => {
        if (hl && consensusPhase !== 'none') {
            actions.updateSwapFlags(hl, { consensusPhase })
        }
    }, [hl, actions, consensusPhase])

    // Order streaming — only for swaps with a solverId
    const destRedeemTx = derived.htlcFromApi?.transactions?.find(
        (t: any) => t.type === 'HTLCRedeem' && t.network === swap?.destination
    )

    const onOrderFailed = useCallback((reason: string) => {
        if (!hl) return
        const error = new TrainError(reason, TrainErrorCode.OrderFailed)
        actions.updateSwapFlags(hl, { error })
        config.onError?.(error)
    }, [actions, hl, config])

    useOrderStream({
        baseUrl: config.baseUrl,
        solverId: swap?.solver ?? undefined,
        hashlock: hl ?? undefined,
        enabled: !!swap?.hashlock && !destRedeemTx,
        store,
        onFailed: onOrderFailed,
    })

    // Write-behind to persisted swap history (guard against redundant writes)
    const prevRef = useRef<{ status: HTLCStatus | null; destTxId: string | null; createdAt: number | null; timelock: number | null }>({
        status: null, destTxId: null, createdAt: null, timelock: null,
    })
    useEffect(() => {
        if (!hl || !swap?.hashlock) return
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
        if (Object.keys(updates).length > 0) {
            actions.updateSwap(hl, updates)
        }
    }, [hl, actions, swap?.hashlock, derived.status, derived.destRedeemTxId, sourceDetails?.blockTimestamp, sourceDetails?.timelock])

    return derived
}
