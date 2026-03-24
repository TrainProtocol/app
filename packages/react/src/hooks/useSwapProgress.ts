import { useEffect, useMemo, useCallback, useSyncExternalStore } from 'react'
import { HTLCStatus, TERMINAL_STATUSES } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useUserLockPolling } from '../internal/useUserLockPolling'
import { useSolverLockPolling } from '../internal/useSolverLockPolling'
import { useOrderStream } from '../internal/useOrderStream'
import { useDerivedSwapState, type DerivedSwapState } from '../internal/useDerivedSwapState'
import { TrainError, TrainErrorCode } from '../types'

function getLockType(tokenContract: string | null | undefined): 'erc20' | 'native' {
    if (!tokenContract || tokenContract === '0x0000000000000000000000000000000000000000') {
        return 'native'
    }
    return 'erc20'
}

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
    const { config, sdk } = useTrainContext()
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

    // Determine chain namespaces from CAIP-2 IDs
    const sourceNamespace = swapConfig?.sourceNetwork?.split(':')[0] ?? null
    const destNamespace = swapConfig?.destinationNetwork?.split(':')[0] ?? null

    // Whether polling should be active
    const isActive = !!swapConfig?.hashlock && !TERMINAL_STATUSES.has(derived.status)

    // Source chain polling params
    const userLockParams = useMemo(() => {
        if (!swapConfig?.hashlock || !swapConfig?.srcContract || !swapConfig?.chainId) return null
        return {
            type: getLockType(swapConfig.tokenContractAddress),
            id: swapConfig.hashlock,
            chainId: swapConfig.chainId,
            contractAddress: swapConfig.srcContract,
            txId: swapConfig.txId ?? undefined,
        }
    }, [swapConfig?.hashlock, swapConfig?.srcContract, swapConfig?.chainId, swapConfig?.tokenContractAddress, swapConfig?.txId])

    // Destination chain polling params
    const solverLockParams = useMemo(() => {
        if (!swapConfig?.hashlock || !swapConfig?.destContract) return null
        const destChainId = swapConfig.destinationNetwork?.split(':')[1] ?? null
        return {
            type: getLockType(swapConfig.quote?.route?.destination?.tokenContract ?? swapConfig.destinationAsset?.contractAddress),
            id: swapConfig.hashlock,
            chainId: destChainId,
            contractAddress: swapConfig.destContract,
            solverAddress: swapConfig.quote?.destinationSolverAddress,
        }
    }, [swapConfig?.hashlock, swapConfig?.destContract, swapConfig?.destinationNetwork, swapConfig?.quote, swapConfig?.destinationAsset])

    // Resolve destination chain node URLs for solver lock verification
    const destNodeUrls = useMemo(() => {
        if (!swapConfig?.destinationNetwork || !config.resolveNodeUrls) return []
        return config.resolveNodeUrls(swapConfig.destinationNetwork)
    }, [swapConfig?.destinationNetwork, config.resolveNodeUrls])

    // Create read-only HTLC clients for polling
    const sourceReadClient = useMemo(() => {
        if (!sourceNamespace || !swapConfig?.sourceNetwork) return null
        try {
            const adapterConfig = walletCtx.getClientConfigForNetwork(swapConfig.sourceNetwork)
            return sdk.createHTLCClient(sourceNamespace, { ...adapterConfig } as any)
        } catch { return null }
    }, [sourceNamespace, swapConfig?.sourceNetwork, walletCtx, sdk])

    const destReadClient = useMemo(() => {
        if (!destNamespace || !swapConfig?.destinationNetwork) return null
        try {
            const adapterConfig = walletCtx.getClientConfigForNetwork(swapConfig.destinationNetwork)
            return sdk.createHTLCClient(destNamespace, { ...adapterConfig } as any)
        } catch { return null }
    }, [destNamespace, swapConfig?.destinationNetwork, walletCtx, sdk])

    const onConsensusFailed = useCallback((error: Error) => {
        if (!hl || !store) return
        const trainError = error instanceof TrainError
            ? error
            : new TrainError(error.message, TrainErrorCode.VerificationFailed, error)
        store.getState().setActiveSwapError(hl, trainError)
        config.onError?.(trainError)
    }, [hl, store, config])

    // Activate polling hooks — data returned directly, not via store
    const sourceDetails = useUserLockPolling({
        client: sourceReadClient,
        params: userLockParams,
        enabled: isActive,
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

    // Order streaming
    const destRedeemTx = derived.htlcFromApi?.transactions?.find(
        (t: any) => t.type === 'HTLCRedeem' && t.network === swapConfig?.destinationNetwork
    )

    const onOrderFailed = useCallback((reason: string) => {
        if (!hl) return
        const error = new TrainError(reason, TrainErrorCode.OrderFailed)
        store?.getState().setActiveSwapError(hl, error)
        config.onError?.(error)
    }, [store, hl, config])

    useOrderStream({
        baseUrl: config.baseUrl,
        solverId: swapConfig?.solverId ?? undefined,
        hashlock: hl ?? undefined,
        enabled: isActive && !!solverLockDetails && !destRedeemTx,
        store,
        onFailed: onOrderFailed,
    })

    // Write-behind to persisted swap history
    useEffect(() => {
        if (!store || !hl || !swapConfig?.hashlock) return
        store.getState().updateSwap(hl, {
            status: derived.status,
            destTxId: derived.destRedeemTxId ?? undefined,
            createdAt: sourceDetails?.blockTimestamp,
            timelock: sourceDetails?.timelock,
            sourceAddress: swapConfig.sourceAddress ?? undefined,
            destinationAddress: swapConfig.destinationAddress ?? undefined,
        })
    }, [store, hl, swapConfig?.hashlock, derived.status, derived.destRedeemTxId, sourceDetails?.blockTimestamp, sourceDetails?.timelock])

    return derived
}
