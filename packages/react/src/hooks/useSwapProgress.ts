import { useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from 'react'
import {
    HTLCStatus,
    TERMINAL_STATUSES,
    deriveSecretFromTimelock,
    secretToHashlock,
    bytesToHex,
} from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useSharedSecretDerivation } from '../providers/SecretDerivationProvider'
import { useUserLockPolling } from '../internal/useUserLockPolling'
import { useSolverLockPolling } from '../internal/useSolverLockPolling'
import { useOrderStream } from '../internal/useOrderStream'
import { useDerivedSwapState, type DerivedSwapState } from '../internal/useDerivedSwapState'
import { TrainError, TrainErrorCode } from '../types'

/** Ref-count per hashlock so multiple useSwapProgress(hl) calls share one active entry */
const subscriberCounts = new Map<string, number>()

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
 * in-memory active state, starts polling (source chain, destination chain,
 * order stream), re-derives the secret when on-chain data arrives, and
 * returns all derived state.
 *
 * Usage:
 * ```tsx
 * const progress = useSwapProgress('0xabc...')
 * // progress.status, progress.sourceDetails, progress.consensusVerified, etc.
 * ```
 *
 * When hashlock is null/undefined, polling is inactive and empty state is returned.
 * On unmount (or hashlock change), active state is cleaned up.
 */
export function useSwapProgress(hashlock: string | null | undefined): DerivedSwapState {
    const hl = hashlock ?? null
    const { config, sdk } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const { derivedKey } = useSharedSecretDerivation()

    // Read active swap for this hashlock
    const activeSwap = useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => (store && hl) ? store.getState().activeSwaps[hl] ?? null : null,
        () => null,
    )

    // Activate swap from persisted data on mount, cleanup on unmount.
    // Ref-counted: only the last subscriber to unmount removes the active swap.
    useEffect(() => {
        if (!hl || !store) return

        const count = (subscriberCounts.get(hl) ?? 0) + 1
        subscriberCounts.set(hl, count)

        if (count === 1) {
            // First subscriber — activate (no-op if already active from createSwap)
            store.getState().activateSwap(hl)
        }

        return () => {
            const current = (subscriberCounts.get(hl) ?? 1) - 1
            if (current <= 0) {
                subscriberCounts.delete(hl)
                store.getState().removeActiveSwap(hl)
            } else {
                subscriberCounts.set(hl, current)
            }
        }
    }, [hl, store])

    // Derived state (status, secretRevealed, manualClaimRequired, etc.)
    const derived = useDerivedSwapState(store, hl)

    // Determine chain namespaces from CAIP-2 IDs
    const sourceNamespace = activeSwap?.sourceNetwork?.split(':')[0] ?? null
    const destNamespace = activeSwap?.destinationNetwork?.split(':')[0] ?? null

    // Re-derive secret on resume when sourceDetails arrives with nonce (userData)
    useEffect(() => {
        if (!store || !activeSwap || !hl) return
        if (activeSwap.secret || !activeSwap.hashlock || !derivedKey || !activeSwap.sourceDetails?.userData) return
        try {
            const nonce = Number(activeSwap.sourceDetails.userData)
            if (!nonce || isNaN(nonce)) return
            const secretBytes = deriveSecretFromTimelock(derivedKey, nonce)
            const secret = bytesToHex(Array.from(secretBytes))
            const computedHashlock = secretToHashlock(secret)
            if (computedHashlock.toLowerCase() === activeSwap.hashlock.toLowerCase()) {
                store.getState().setSecretAndNonce(hl, secret, nonce)
            } else {
                console.warn('[useSwapProgress] Derived hashlock mismatch — derivedKey may be from a different login session')
            }
        } catch (e) {
            console.error('[useSwapProgress] Failed to re-derive secret:', e)
        }
    }, [store, hl, activeSwap?.secret, activeSwap?.hashlock, activeSwap?.sourceDetails?.userData, derivedKey])

    // Whether polling should be active
    const isActive = !!activeSwap?.hashlock && !TERMINAL_STATUSES.has(derived.status)

    // Source chain polling params
    const userLockParams = useMemo(() => {
        if (!activeSwap?.hashlock || !activeSwap?.srcContract || !activeSwap?.chainId) return null
        return {
            type: getLockType(activeSwap.tokenContractAddress),
            id: activeSwap.hashlock,
            chainId: activeSwap.chainId,
            contractAddress: activeSwap.srcContract,
            txId: activeSwap.txId ?? undefined,
        }
    }, [activeSwap?.hashlock, activeSwap?.srcContract, activeSwap?.chainId, activeSwap?.tokenContractAddress, activeSwap?.txId])

    // Destination chain polling params
    const solverLockParams = useMemo(() => {
        if (!activeSwap?.hashlock || !activeSwap?.destContract) return null
        const destChainId = activeSwap.destinationNetwork?.split(':')[1] ?? null
        return {
            type: getLockType(activeSwap.quote?.route?.destination?.tokenContract ?? activeSwap.destinationAsset?.contractAddress),
            id: activeSwap.hashlock,
            chainId: destChainId,
            contractAddress: activeSwap.destContract,
            solverAddress: activeSwap.quote?.destinationSolverAddress,
        }
    }, [activeSwap?.hashlock, activeSwap?.destContract, activeSwap?.destinationNetwork, activeSwap?.quote, activeSwap?.destinationAsset])

    // Resolve destination chain node URLs for solver lock verification
    const destNodeUrls = useMemo(() => {
        if (!activeSwap?.destinationNetwork || !config.resolveNodeUrls) return []
        return config.resolveNodeUrls(activeSwap.destinationNetwork)
    }, [activeSwap?.destinationNetwork, config.resolveNodeUrls])

    // Create read-only HTLC clients for polling
    const sourceReadClient = useMemo(() => {
        if (!sourceNamespace || !activeSwap?.sourceNetwork) return null
        try {
            const adapterConfig = walletCtx.getClientConfigForNetwork(activeSwap.sourceNetwork)
            return sdk.createHTLCClient(sourceNamespace, { ...adapterConfig } as any)
        } catch { return null }
    }, [sourceNamespace, activeSwap?.sourceNetwork, walletCtx, sdk])

    const destReadClient = useMemo(() => {
        if (!destNamespace || !activeSwap?.destinationNetwork) return null
        try {
            const adapterConfig = walletCtx.getClientConfigForNetwork(activeSwap.destinationNetwork)
            return sdk.createHTLCClient(destNamespace, { ...adapterConfig } as any)
        } catch { return null }
    }, [destNamespace, activeSwap?.destinationNetwork, walletCtx, sdk])

    const onConsensusFailed = useCallback((error: Error) => {
        const trainError = error instanceof TrainError
            ? error
            : new TrainError(error.message, TrainErrorCode.VerificationFailed, error)
        config.onError?.(trainError)
    }, [config])

    // Activate polling hooks
    useUserLockPolling({
        client: sourceReadClient,
        params: userLockParams,
        hashlock: hl,
        enabled: isActive,
        store,
    })

    useSolverLockPolling({
        client: destReadClient,
        params: solverLockParams,
        hashlock: hl,
        nodeUrls: destNodeUrls,
        enabled: isActive && derived.status !== HTLCStatus.Initial,
        store,
        onConsensusFailed,
    })

    // Order streaming
    const destRedeemTx = activeSwap?.htlcFromApi?.transactions?.find(
        (t: any) => t.type === 'HTLCRedeem' && t.network === activeSwap?.destinationNetwork
    )

    const onOrderFailed = useCallback((reason: string) => {
        if (!hl) return
        const error = new TrainError(reason, TrainErrorCode.OrderFailed)
        store?.getState().setActiveSwapError(hl, error)
        config.onError?.(error)
    }, [store, hl, config])

    useOrderStream({
        baseUrl: config.baseUrl,
        solverId: activeSwap?.solverId ?? undefined,
        hashlock: hl ?? undefined,
        enabled: isActive && !!activeSwap?.solverLockDetails && !destRedeemTx,
        store,
        onFailed: onOrderFailed,
    })

    // Write-behind to persisted swap history
    useEffect(() => {
        if (!store || !hl || !activeSwap?.hashlock) return
        store.getState().updateSwap(hl, {
            status: derived.status,
            destTxId: derived.destRedeemTxId ?? undefined,
            createdAt: activeSwap.sourceDetails?.blockTimestamp,
            timelock: activeSwap.sourceDetails?.timelock,
            sourceAddress: activeSwap.sourceAddress ?? undefined,
            destinationAddress: activeSwap.destinationAddress ?? undefined,
        })
    }, [store, hl, activeSwap?.hashlock, derived.status, derived.destRedeemTxId, activeSwap?.sourceDetails?.blockTimestamp, activeSwap?.sourceDetails?.timelock])

    return derived
}
