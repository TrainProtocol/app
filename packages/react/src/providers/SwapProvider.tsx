import {
    createContext,
    useContext,
    useCallback,
    useMemo,
    useEffect,
    useRef,
    useSyncExternalStore,
    type ReactNode,
} from 'react'
import {
    HTLCStatus,
    TERMINAL_STATUSES,
    deriveSecretFromTimelock,
    secretToHashlock,
    bytesToHex,
} from '@train-protocol/sdk'
import type {
    UserLockDetails,
    SolverLockDetails,
    HTLCFromApi,
    Token,
    RecoveredSwapData,
} from '@train-protocol/sdk'
import { useTrainContext } from './TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from './TrainProvider'
import { useUserLockPolling } from '../internal/useUserLockPolling'
import { useSolverLockPolling } from '../internal/useSolverLockPolling'
import { useOrderStream } from '../internal/useOrderStream'
import { useDerivedSwapState } from '../internal/useDerivedSwapState'
import { TrainError, TrainErrorCode } from '../types'
import type { StartSwapParams, SwapData } from '../types'
import { useSharedSecretDerivation } from './SecretDerivationProvider'

// --- Context ---

/** Params for resuming an existing swap from persisted storage */
export interface ResumeSwapParams {
    hashlock: string
    txId?: string
    sourceNetwork: string
    destinationNetwork: string
    srcContract?: string
    destContract?: string
    tokenContractAddress?: string
    sourceAddress?: string
    destinationAddress?: string
    chainId?: string
    solverId?: string
    sourceAsset?: Token | null
    destinationAsset?: string
    requestedAmount?: string
    secretRevealed?: boolean
    destinationSolverAddress?: string
}

export interface SwapContextValue {
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

    /** Set pre-lock swap data and reset lifecycle state for a new swap */
    setCurrentSwap: (data: SwapData) => void
    startSwap: (params: StartSwapParams, derivedKey: Uint8Array) => Promise<void>
    /** Resume monitoring an existing (persisted) swap without calling userLock again */
    resumeSwap: (params: ResumeSwapParams) => void
    revealSecret: () => Promise<void>
    refund: () => Promise<string>
    manualClaim: (secret: string) => Promise<string>
    recoverSwap: (txHash: string, chainNamespace: string, rpcUrl: string) => Promise<RecoveredSwapData>
    setError: (error: Error | null) => void
    reset: () => void
}

const SwapContext = createContext<SwapContextValue | null>(null)

export function useSwapContext(): SwapContextValue {
    const ctx = useContext(SwapContext)
    if (!ctx) {
        throw new Error('useSwapContext must be used within a <SwapProvider>')
    }
    return ctx
}

// --- Helpers ---

function getLockType(tokenContract: string | null | undefined): 'erc20' | 'native' {
    if (!tokenContract || tokenContract === '0x0000000000000000000000000000000000000000') {
        return 'native'
    }
    return 'erc20'
}

// --- Provider ---

export function SwapProvider({ children }: { children: ReactNode }) {
    const { apiClient, config, sdk } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const { derivedKey } = useSharedSecretDerivation()

    // Read activeSwap from store for polling params
    const activeSwap = useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => { },
        () => store?.getState().activeSwap ?? null,
        () => null,
    )

    // Derived state (status, secretRevealed, manualClaimRequired, etc.)
    const derived = useDerivedSwapState(store)

    // Determine chain namespaces from CAIP-2 IDs
    const sourceNamespace = activeSwap?.sourceNetwork?.split(':')[0] ?? null
    const destNamespace = activeSwap?.destinationNetwork?.split(':')[0] ?? null

    // Re-derive secret on resume when sourceDetails arrives with nonce (userData)
    useEffect(() => {
        if (!store || !activeSwap) return
        if (activeSwap.secret || !activeSwap.hashlock || !derivedKey || !activeSwap.sourceDetails?.userData) return
        try {
            const nonce = Number(activeSwap.sourceDetails.userData)
            if (!nonce || isNaN(nonce)) return
            const secretBytes = deriveSecretFromTimelock(derivedKey, nonce)
            const secret = bytesToHex(Array.from(secretBytes))
            const hashlock = secretToHashlock(secret)
            // Verify the derived hashlock matches the on-chain one
            if (hashlock.toLowerCase() === activeSwap.hashlock.toLowerCase()) {
                store.getState().setSecretAndNonce(secret, nonce)
            } else {
                console.warn('[SwapProvider] Derived hashlock mismatch — derivedKey may be from a different login session')
            }
        } catch (e) {
            console.error('[SwapProvider] Failed to re-derive secret:', e)
        }
    }, [store, activeSwap?.secret, activeSwap?.hashlock, activeSwap?.sourceDetails?.userData, derivedKey])

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
            type: getLockType(activeSwap.quote?.route?.destination?.tokenContract ?? activeSwap.destinationAsset),
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
        if (!sourceNamespace) return null
        try {
            const adapterConfig = walletCtx.getClientConfig(sourceNamespace)
            return sdk.createHTLCClient(sourceNamespace, { ...adapterConfig } as any)
        } catch { return null }
    }, [sourceNamespace, walletCtx])

    const destReadClient = useMemo(() => {
        if (!destNamespace || !activeSwap?.destinationNetwork) return null
        try {
            const adapterConfig = walletCtx.getClientConfigForNetwork(activeSwap.destinationNetwork)
            return sdk.createHTLCClient(destNamespace, { ...adapterConfig } as any)
        } catch { return null }
    }, [destNamespace, activeSwap?.destinationNetwork, walletCtx])

    const onConsensusFailed = useCallback((error: Error) => {
        const trainError = error instanceof TrainError
            ? error
            : new TrainError(error.message, TrainErrorCode.VerificationFailed, error)
        config.onError?.(trainError)
    }, [config])

    // Activate polling hooks — write directly to store
    useUserLockPolling({
        client: sourceReadClient,
        params: userLockParams,
        enabled: isActive,
        store,
    })

    useSolverLockPolling({
        client: destReadClient,
        params: solverLockParams,
        nodeUrls: destNodeUrls,
        enabled: isActive && derived.status !== HTLCStatus.Initial,
        store,
        onConsensusFailed,
    })

    // Order streaming
    const destRedeemTx = activeSwap?.htlcFromApi?.transactions?.find(
        (t: any) => t.type === 'HTLCRedeem' && t.network === activeSwap?.destinationNetwork
    )

    useOrderStream({
        baseUrl: config.baseUrl,
        solverId: activeSwap?.solverId ?? undefined,
        hashlock: activeSwap?.hashlock ?? undefined,
        enabled: isActive && !!activeSwap?.solverLockDetails && !destRedeemTx,
        store,
    })

    // Write-behind to persisted swap history
    useEffect(() => {
        if (!store || !activeSwap?.hashlock) return
        store.getState().updateSwap(activeSwap.hashlock, {
            status: derived.status,
            destTxId: derived.destRedeemTxId ?? undefined,
            createdAt: activeSwap.sourceDetails?.blockTimestamp,
            timelock: activeSwap.sourceDetails?.timelock,
            sourceAddress: activeSwap.sourceAddress ?? undefined,
            destinationAddress: activeSwap.destinationAddress ?? undefined,
        })
    }, [store, activeSwap?.hashlock, derived.status, derived.destRedeemTxId, activeSwap?.sourceDetails?.blockTimestamp, activeSwap?.sourceDetails?.timelock])

    // --- Actions ---

    const startSwapInFlight = useRef(false)
    const revealSecretInFlight = useRef(false)

    const startSwap = useCallback(async (params: StartSwapParams, derivedKey: Uint8Array) => {
        if (startSwapInFlight.current) return
        startSwapInFlight.current = true
        try {
            const nonce = Date.now()
            const secretBytes = deriveSecretFromTimelock(derivedKey, nonce)
            const secret = bytesToHex(Array.from(secretBytes))
            const hashlock = secretToHashlock(secret)

            // Get signer from wallet adapter
            const namespace = params.sourceNetwork.split(':')[0]
            const signer = walletCtx.getSigner(namespace)
            if (!signer) {
                throw new TrainError(
                    `No wallet adapter registered for ${namespace}`,
                    TrainErrorCode.WalletNotConnected,
                )
            }

            // Create write client with signer + adapter config
            const adapterConfig = walletCtx.getClientConfig(namespace)
            const client = sdk.createHTLCClient(namespace, {
                ...adapterConfig,
                signer,
            } as any)

            const result = await client.userLock({
                sourceChain: params.sourceNetwork,
                destinationChain: params.destinationNetwork,
                amount: params.amount,
                destinationAmount: params.quote.receiveAmount,
                decimals: params.sourceAsset.decimals,
                destinationAsset: params.destinationAsset,
                sourceAsset: params.sourceAsset,
                destLpAddress: params.quote.destinationSolverAddress,
                srcLpAddress: params.quote.sourceSolverAddress,
                atomicContract: params.srcContract,
                sourceAddress: params.sourceAddress,
                destinationAddress: params.destinationAddress,
                tokenContractAddress: params.tokenContractAddress,
                chainId: params.chainId ?? params.sourceNetwork.split(':')[1],
                quoteExpiry: params.quote.quoteExpirationTimestampInSeconds,
                rewardToken: params.quote.reward?.rewardToken,
                rewardRecipient: params.quote.reward?.rewardRecipientAddress,
                rewardAmount: params.quote.reward?.amount,
                rewardTimelockDelta: params.quote.reward?.rewardTimelockTimeSpanInSeconds,
                timelockDelta: params.quote.timelock?.timelockTimeSpanInSeconds,
                hashlock,
                nonce,
                solverData: params.quote.signature,
            })

            // Initialize active swap in store
            if (store) {
                store.getState().initActiveSwap({
                    hashlock: result.hashlock,
                    nonce,
                    secret,
                    solverId: params.solverId,
                    sourceNetwork: params.sourceNetwork,
                    destinationNetwork: params.destinationNetwork,
                    srcContract: params.srcContract,
                    destContract: params.destContract,
                    tokenContractAddress: params.tokenContractAddress ?? null,
                    sourceAddress: params.sourceAddress,
                    destinationAddress: params.destinationAddress,
                    chainId: params.chainId ?? params.sourceNetwork.split(':')[1],
                    txId: result.hash,
                    sourceAsset: params.sourceAsset,
                    destinationAsset: params.destinationAsset,
                    quote: params.quote,
                    requestedAmount: params.amount,
                })

                // Commit to persisted swap history
                store.getState().commitSwap(result.hashlock, result.hash)
            }
        } catch (err) {
            const error = err instanceof TrainError
                ? err
                : new TrainError(
                    err instanceof Error ? err.message : String(err),
                    TrainErrorCode.LockFailed,
                    err,
                )
            if (store) store.getState().setActiveSwapError(error)
            config.onError?.(error)
            throw error
        } finally {
            startSwapInFlight.current = false
        }
    }, [walletCtx, store, config, sdk])

    const revealSecret = useCallback(async () => {
        if (revealSecretInFlight.current) return
        revealSecretInFlight.current = true
        const swap = store?.getState().activeSwap
        if (!swap?.solverId || !swap?.hashlock || !swap?.secret) {
            console.error('[SwapProvider.revealSecret] MISSING:', { solverId: !!swap?.solverId, hashlock: !!swap?.hashlock, secret: !!swap?.secret })
            throw new TrainError('Cannot reveal: missing solverId, hashlock, or secret', TrainErrorCode.RevealFailed)
        }

        try {
            await apiClient.revealSecret(swap.solverId, swap.hashlock, swap.secret)

            if (store) {
                store.getState().setSecretRevealedToApi()
                store.getState().updateSwap(swap.hashlock, { secretRevealed: true })
            }
        } catch (err) {
            console.error('[SwapProvider.revealSecret] FAILED:', err)
            const error = new TrainError(
                err instanceof Error ? err.message : String(err),
                TrainErrorCode.RevealFailed,
                err,
            )
            if (store) store.getState().setActiveSwapError(error)
            config.onError?.(error)
            throw error
        } finally {
            revealSecretInFlight.current = false
        }
    }, [apiClient, store, config])

    const refund = useCallback(async (): Promise<string> => {
        const swap = store?.getState().activeSwap
        const srcNamespace = swap?.sourceNetwork?.split(':')[0] ?? null
        if (!swap?.hashlock || !srcNamespace || !swap?.srcContract || !swap?.sourceAsset) {
            throw new TrainError('Cannot refund: missing required params', TrainErrorCode.RefundFailed)
        }

        try {
            const signer = walletCtx.getSigner(srcNamespace)
            if (!signer) {
                throw new TrainError(`No wallet adapter for ${srcNamespace}`, TrainErrorCode.WalletNotConnected)
            }

            const adapterConfig = walletCtx.getClientConfig(srcNamespace)
            const client = sdk.createHTLCClient(srcNamespace, { ...adapterConfig, signer } as any)
            const txHash = await client.refund({
                type: getLockType(swap.tokenContractAddress),
                chainId: swap.chainId,
                contractAddress: swap.srcContract,
                id: swap.hashlock,
                sourceAsset: swap.sourceAsset,
            })

            if (store) {
                store.getState().updateSwap(swap.hashlock, { refundTxId: txHash })
            }

            return txHash
        } catch (err) {
            const error = err instanceof TrainError
                ? err
                : new TrainError(err instanceof Error ? err.message : String(err), TrainErrorCode.RefundFailed, err)
            if (store) store.getState().setActiveSwapError(error)
            config.onError?.(error)
            throw error
        }
    }, [walletCtx, sdk, store, config])

    const manualClaim = useCallback(async (secret: string): Promise<string> => {
        const swap = store?.getState().activeSwap
        const dstNamespace = swap?.destinationNetwork?.split(':')[0] ?? null
        if (!swap?.hashlock || !dstNamespace || !swap?.destinationNetwork || !swap?.destContract) {
            throw new TrainError('Cannot claim: missing required params', TrainErrorCode.ClaimFailed)
        }

        try {
            const signer = walletCtx.getSignerForNetwork(swap.destinationNetwork)
            if (!signer) {
                throw new TrainError(`No wallet adapter for ${dstNamespace}`, TrainErrorCode.WalletNotConnected)
            }

            const adapterConfig = walletCtx.getClientConfigForNetwork(swap.destinationNetwork)
            const client = sdk.createHTLCClient(dstNamespace, { ...adapterConfig, signer } as any)
            const txHash = await client.redeemSolver({
                chainId: swap.destinationNetwork.split(':')[1] ?? null,
                contractAddress: swap.destContract,
                id: swap.hashlock,
                secret,
                destinationAddress: swap.destinationAddress ?? undefined,
            })

            if (store) {
                store.getState().updateSwap(swap.hashlock, { destTxId: txHash })
            }

            return txHash
        } catch (err) {
            const error = err instanceof TrainError
                ? err
                : new TrainError(err instanceof Error ? err.message : String(err), TrainErrorCode.ClaimFailed, err)
            if (store) store.getState().setActiveSwapError(error)
            config.onError?.(error)
            throw error
        }
    }, [walletCtx, sdk, store, config])

    const recoverSwapFromTx = useCallback(async (txHash: string, chainNamespace: string, rpcUrl: string) => {
        try {
            const adapterConfig = walletCtx.getClientConfig(chainNamespace)
            const client = sdk.createHTLCClient(chainNamespace, { ...adapterConfig, rpcUrl } as any)
            const recovered = await client.recoverSwap(txHash)

            if (store) {
                store.getState().initActiveSwap({
                    hashlock: recovered.hashlock,
                    nonce: null,
                    secret: null,
                    solverId: null,
                    sourceNetwork: recovered.srcChain,
                    destinationNetwork: recovered.dstChain,
                    srcContract: recovered.srcContract,
                    destContract: null,
                    tokenContractAddress: null,
                    sourceAddress: recovered.sender,
                    destinationAddress: recovered.dstAddress,
                    chainId: null,
                    txId: txHash,
                    sourceAsset: null,
                    destinationAsset: null,
                    quote: null,
                    requestedAmount: recovered.amount.toString(),
                })

                const swapData: SwapData = {
                    requestedAmount: recovered.amount.toString(),
                    address: recovered.sender,
                    source: recovered.srcChain,
                    destination: recovered.dstChain,
                    source_asset: recovered.token,
                    destination_asset: recovered.dstToken,
                    srcContract: recovered.srcContract,
                    hashlock: recovered.hashlock,
                    txId: txHash,
                }
                store.getState().recoverSwap(recovered.hashlock, swapData)
            }
            return recovered
        } catch (err) {
            const error = new TrainError(
                err instanceof Error ? err.message : String(err),
                TrainErrorCode.RecoverFailed,
                err,
            )
            if (store) store.getState().setActiveSwapError(error)
            config.onError?.(error)
            throw error
        }
    }, [sdk, walletCtx, store, config])

    const resumeSwap = useCallback((params: ResumeSwapParams) => {
        if (!store) return
        store.getState().initActiveSwap({
            hashlock: params.hashlock,
            nonce: null,
            secret: null,
            solverId: params.solverId ?? null,
            sourceNetwork: params.sourceNetwork,
            destinationNetwork: params.destinationNetwork,
            srcContract: params.srcContract ?? null,
            destContract: params.destContract ?? null,
            tokenContractAddress: params.tokenContractAddress ?? null,
            sourceAddress: params.sourceAddress ?? null,
            destinationAddress: params.destinationAddress ?? null,
            chainId: params.chainId ?? params.sourceNetwork.split(':')[1],
            txId: params.txId ?? null,
            sourceAsset: params.sourceAsset ?? null,
            destinationAsset: params.destinationAsset ?? null,
            quote: null,
            requestedAmount: params.requestedAmount ?? null,
            secretRevealed: params.secretRevealed,
        })
    }, [store])

    const setError = useCallback((error: Error | null) => {
        if (store) store.getState().setActiveSwapError(error)
    }, [store])

    const setCurrentSwap = useCallback((data: SwapData) => {
        if (store) {
            store.getState().resetActiveSwap()
            store.getState().setCurrentSwap(data)
        }
    }, [store])

    const reset = useCallback(() => {
        if (store) store.getState().resetActiveSwap()
    }, [store])
    const value = useMemo<SwapContextValue>(() => ({
        status: derived.status,
        hashlock: derived.hashlock,
        sourceDetails: derived.sourceDetails,
        solverLockDetails: derived.solverLockDetails,
        htlcFromApi: derived.htlcFromApi,
        secretRevealed: derived.secretRevealed,
        isTimelockExpired: derived.isTimelockExpired,
        manualClaimRequired: derived.manualClaimRequired,
        destRedeemTxId: derived.destRedeemTxId,
        error: derived.error,
        consensusVerifying: derived.consensusVerifying,
        consensusVerified: derived.consensusVerified,
        setCurrentSwap,
        startSwap,
        resumeSwap,
        revealSecret,
        refund,
        manualClaim,
        recoverSwap: recoverSwapFromTx,
        setError,
        reset,
    }), [
        derived.status, derived.hashlock, derived.sourceDetails, derived.solverLockDetails,
        derived.htlcFromApi, derived.secretRevealed, derived.isTimelockExpired, derived.manualClaimRequired,
        derived.destRedeemTxId, derived.error, derived.consensusVerifying, derived.consensusVerified,
        setCurrentSwap, startSwap, resumeSwap, revealSecret, refund, manualClaim, recoverSwapFromTx, setError, reset,
    ])

    return (
        <SwapContext.Provider value={value}>
            {children}
        </SwapContext.Provider>
    )
}
