import { useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from 'react'
import { HTLCStatus, LockParams, TERMINAL_STATUSES, formatUnits } from '@train-protocol/sdk'
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
    const { networkMap, prices } = useNetworksContext()

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

    // Destination chain polling params — requires destContract and solver. The solver
    // address is half of the lock's on-chain key, so without it there is nothing to read
    // and polling must stay off rather than fail every node. `useRecoverSwap` back-fills it
    // from the source lock's reward recipient; a reward-less quote leaves it genuinely
    // unknown, which the effect below reports rather than letting the swap sit silent.
    const solverLockParams: LockParams | null = useMemo(() => {
        if (!swap?.hashlock || !swap?.destContract || !swap?.destination) return null
        if (!swap.destinationSolverAddress) return null
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

    // Without the solver's destination address the lock cannot be addressed at all, so
    // destination polling never starts. Say so once instead of leaving the swap on
    // "reserving assets on destination" until the timelock expires. Not overridable —
    // there is no lock to read, so continuing anyway would gain the user nothing.
    const missingSolverReportedFor = useRef<string | null>(null)
    useEffect(() => {
        if (!hl || !swap?.destContract || !swap?.destination) return
        if (swap.destinationSolverAddress) {
            if (missingSolverReportedFor.current === hl) missingSolverReportedFor.current = null
            return
        }
        if (derived.status === HTLCStatus.Initial || TERMINAL_STATUSES.has(derived.status)) return
        if (missingSolverReportedFor.current === hl) return
        missingSolverReportedFor.current = hl

        const error = new TrainError(
            'Cannot monitor the destination lock: this swap has no destination solver address, '
            + 'so the solver lock cannot be located on-chain. Refund once the source timelock expires.',
            TrainErrorCode.VerificationFailed,
        )
        actions.updateSwapFlags(hl, { error, manualConsensusOverrideAllowed: false })
        config.onError?.(error)
    }, [hl, swap?.destContract, swap?.destination, swap?.destinationSolverAddress, derived.status, actions, config])

    // Resolve destination chain node URLs for solver lock verification
    const destNodeUrls = useMemo(() => {
        if (!swap?.destination || !config.resolveNodeUrls) return []
        return config.resolveNodeUrls(caip2Id(swap.destination))
    }, [swap?.destination, config.resolveNodeUrls])

    // Resolve the destination chain's trustless light-client verifier. Reserved
    // for large swaps: below config.lightClientMinAmountUsd the plain multi-RPC
    // consensus path is protection enough and the WASM worker is never spawned.
    // The gate compares the SOURCE amount — that is what the user loses if a
    // fake solver lock tricked the app into revealing the secret. A swap that
    // cannot be valued (missing price) is treated as large: unknown size must
    // not silently skip the stronger check, and light-client failure still
    // falls back to consensus.
    const destLightClient = useMemo(() => {
        if (!swap?.destination || !config.resolveLightClient) return null
        const threshold = config.lightClientMinAmountUsd ?? 0
        if (threshold > 0 && swap.source) {
            const amount = Number(swap.requestedAmount)
            const sourceToken = networkMap.get(swap.source)?.tokens.find(t => t.symbol === swap.source_asset)
            const price = sourceToken ? prices[`${caip2Id(swap.source)}:${sourceToken.contract}`] : undefined
            if (Number.isFinite(amount) && amount > 0 && price && amount * price < threshold) return null
        }
        try {
            return config.resolveLightClient(caip2Id(swap.destination))
        } catch { return null }
    }, [swap?.destination, swap?.source, swap?.source_asset, swap?.requestedAmount, config.resolveLightClient, config.lightClientMinAmountUsd, networkMap, prices])

    // Warm up the light client as soon as the swap is live so its sync overlaps
    // the user-lock latency (solver-lock polling only starts after Initial).
    useEffect(() => {
        if (isActive && destLightClient) destLightClient.warmUp()
    }, [isActive, destLightClient])

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

    const onConsensusFailed = useCallback((error: Error, overridable: boolean) => {
        if (!hl) return
        const trainError = error instanceof TrainError
            ? error
            : new TrainError(error.message, TrainErrorCode.VerificationFailed, error)
        actions.updateSwapFlags(hl, { error: trainError, manualConsensusOverrideAllowed: overridable })
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

    // A user-driven override leaves consensusPhase='verified' with verificationSource='manual'.
    // Detect that to keep the polling hook from clobbering it on remount.
    const flags = hl ? actions.getSwapFlags(hl) : undefined
    const manuallyOverridden = flags?.consensusPhase === 'verified' && flags?.verificationSource === 'manual'

    const { consensusPhase, verifiedNodeCount, verificationSource } = useSolverLockPolling({
        client: destReadClient,
        params: solverLockParams,
        hashlock: hl,
        nodeUrls: destNodeUrls,
        enabled: isActive && derived.status !== HTLCStatus.Initial,
        lightClient: destLightClient,
        manuallyOverridden,
        onConsensusFailed,
    })

    // Sync consensus phase + verification provenance to store flags
    // (one-way, for useDerivedSwapState in other components)
    useEffect(() => {
        if (!hl || consensusPhase === 'none') return
        // Never downgrade a manual override that's already in the flags.
        const current = actions.getSwapFlags(hl)
        if (current?.consensusPhase === 'verified' && current?.verificationSource === 'manual') return
        actions.updateSwapFlags(hl, { consensusPhase, verifiedNodeCount, verificationSource })
    }, [hl, actions, consensusPhase, verifiedNodeCount, verificationSource])

    // Order streaming
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
        solverAddress: swap?.destinationSolverAddress ?? undefined,
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
        const destinationAmount = derived.htlcFromApi?.destinationAmount
        const destTokenDecimals = swap?.destination
            ? networkMap.get(swap.destination)?.tokens.find(t => t.symbol == swap.destination_asset)?.decimals
            : undefined
        if (destinationAmount && destTokenDecimals !== undefined) {
            const formatted = formatUnits(BigInt(destinationAmount), destTokenDecimals)
            if (formatted !== swap.receiveAmount) updates.receiveAmount = formatted
        }
        if (Object.keys(updates).length > 0) {
            actions.updateSwap(hl, updates)
        }
    }, [hl, actions, swap?.hashlock, swap?.destination, swap?.destination_asset, swap?.receiveAmount, derived.status, derived.destRedeemTxId, derived.htlcFromApi?.destinationAmount, sourceDetails?.blockTimestamp, sourceDetails?.timelock, networkMap])

    return derived
}
