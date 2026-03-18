import {
    createContext,
    useContext,
    useReducer,
    useCallback,
    useMemo,
    useRef,
    useEffect,
    type ReactNode,
} from 'react'
import {
    HTLCStatus,
    LockStatus,
    resolveHTLCStatus,
    verifySolverLock,
    deriveSecretFromTimelock,
    secretToHashlock,

} from '@train-protocol/sdk'
import type {
    UserLockDetails,
    SolverLockDetails,
    IHTLCClient,
    HTLCFromApi,
    QuoteDetails,
    Token,
    RecoveredSwapData,
} from '@train-protocol/sdk'
import { useTrainContext } from './TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from './TrainProvider'
import { useUserLockPolling } from '../internal/useUserLockPolling'
import { useSolverLockPolling } from '../internal/useSolverLockPolling'
import { useOrderStream } from '../internal/useOrderStream'
import { useTimelockExpiry } from '../internal/useTimelockExpiry'
import { TrainError, TrainErrorCode } from '../types'
import type { StartSwapParams, SwapData } from '../types'
import { useSharedSecretDerivation } from './SecretDerivationProvider'

// --- State ---

interface SwapState {
    status: HTLCStatus
    hashlock: string | null
    nonce: number | null
    secret: string | null
    solverId: string | null
    sourceDetails: UserLockDetails | null
    solverLockDetails: SolverLockDetails | null
    htlcFromApi: HTLCFromApi | null
    secretRevealed: boolean
    manualClaimRequired: boolean
    destRedeemTxId: string | null
    error: Error | null
    // Params needed for polling/clients
    sourceNetwork: string | null
    destinationNetwork: string | null
    srcContract: string | null
    destContract: string | null
    tokenContractAddress: string | null
    sourceAddress: string | null
    destinationAddress: string | null
    chainId: string | null
    txId: string | null
    sourceAsset: Token | null
    destinationAsset: string | null
    quote: QuoteDetails | null
    requestedAmount: string | null
}

const initialState: SwapState = {
    status: HTLCStatus.Initial,
    hashlock: null,
    nonce: null,
    secret: null,
    solverId: null,
    sourceDetails: null,
    solverLockDetails: null,
    htlcFromApi: null,
    secretRevealed: false,
    manualClaimRequired: false,
    destRedeemTxId: null,
    error: null,
    sourceNetwork: null,
    destinationNetwork: null,
    srcContract: null,
    destContract: null,
    tokenContractAddress: null,
    sourceAddress: null,
    destinationAddress: null,
    chainId: null,
    txId: null,
    sourceAsset: null,
    destinationAsset: null,
    quote: null,
    requestedAmount: null,
}

type SwapAction =
    | { type: 'SET_PARAMS'; payload: Partial<SwapState> }
    | { type: 'USER_LOCKED'; hashlock: string; txId: string; nonce: number; secret: string }
    | { type: 'SET_SOURCE_DETAILS'; details: UserLockDetails }
    | { type: 'SET_SOLVER_LOCK_DETAILS'; details: SolverLockDetails }
    | { type: 'SET_ORDER'; order: HTLCFromApi }
    | { type: 'SECRET_REVEALED' }
    | { type: 'MANUAL_CLAIM_REQUIRED' }
    | { type: 'SET_DEST_REDEEM_TX'; txId: string }
    | { type: 'SET_ERROR'; error: Error }
    | { type: 'RESET' }

function swapReducer(state: SwapState, action: SwapAction): SwapState {
    switch (action.type) {
        case 'SET_PARAMS':
            return { ...state, ...action.payload }
        case 'USER_LOCKED':
            return {
                ...state,
                hashlock: action.hashlock,
                txId: action.txId,
                nonce: action.nonce,
                secret: action.secret,
                error: null,
            }
        case 'SET_SOURCE_DETAILS':
            return { ...state, sourceDetails: action.details }
        case 'SET_SOLVER_LOCK_DETAILS':
            return { ...state, solverLockDetails: action.details }
        case 'SET_ORDER':
            return { ...state, htlcFromApi: action.order }
        case 'SECRET_REVEALED':
            return { ...state, secretRevealed: true }
        case 'MANUAL_CLAIM_REQUIRED':
            return { ...state, manualClaimRequired: true }
        case 'SET_DEST_REDEEM_TX':
            return { ...state, destRedeemTxId: action.txId }
        case 'SET_ERROR':
            return { ...state, error: action.error }
        case 'RESET':
            return { ...initialState }
        default:
            return state
    }
}

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

// --- Provider ---

export function SwapProvider({ children }: { children: ReactNode }) {
    const { apiClient, config, sdk } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const { derivedKey } = useSharedSecretDerivation()
    const [state, dispatch] = useReducer(swapReducer, initialState)

    // Manual claim timer
    const manualClaimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Timelock expiry
    const isTimelockExpired = useTimelockExpiry(state.sourceDetails?.timelock)

    // Resolve HTLC status
    const status = useMemo(() => resolveHTLCStatus({
        sourceDetails: state.sourceDetails ?? undefined,
        solverLockDetails: state.solverLockDetails ?? undefined,
        timelockExpired: isTimelockExpired,
        secretRevealed: state.secretRevealed,
        manualClaimRequired: state.manualClaimRequired,
        destRedeemTxId: state.destRedeemTxId ?? undefined,
    }), [state.sourceDetails, state.solverLockDetails, isTimelockExpired, state.secretRevealed, state.manualClaimRequired, state.destRedeemTxId])

    // Determine chain namespaces from CAIP-2 IDs
    const sourceNamespace = state.sourceNetwork?.split(':')[0] ?? null
    const destNamespace = state.destinationNetwork?.split(':')[0] ?? null

    // Determine lock type
    const getLockType = (tokenContract: string | null | undefined): 'erc20' | 'native' => {
        if (!tokenContract || tokenContract === '0x0000000000000000000000000000000000000000') {
            return 'native'
        }
        return 'erc20'
    }

    // Re-derive secret on resume when sourceDetails arrives with nonce (userData)
    useEffect(() => {
        if (state.secret || !state.hashlock || !derivedKey || !state.sourceDetails?.userData) return
        try {
            const nonce = Number(state.sourceDetails.userData)
            if (!nonce || isNaN(nonce)) return
            const secretBytes = deriveSecretFromTimelock(derivedKey, nonce)
            const secret = '0x' + Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('')
            const hashlock = secretToHashlock(secret)
            // Verify the derived hashlock matches the on-chain one
            if (hashlock.toLowerCase() === state.hashlock.toLowerCase()) {
                dispatch({ type: 'SET_PARAMS', payload: { secret, nonce } })
            } else {
                console.warn('[SwapProvider] Derived hashlock mismatch — derivedKey may be from a different login session')
            }
        } catch (e) {
            console.error('[SwapProvider] Failed to re-derive secret:', e)
        }
    }, [state.secret, state.hashlock, state.sourceDetails?.userData, derivedKey])

    // Whether polling should be active
    const isActive = !!state.hashlock && status !== HTLCStatus.RedeemCompleted && status !== HTLCStatus.Refunded

    // Polling callbacks
    const onSourceDetails = useCallback((details: UserLockDetails) => {
        dispatch({ type: 'SET_SOURCE_DETAILS', details })
    }, [])

    const onSolverLockDetails = useCallback((details: SolverLockDetails) => {
        dispatch({ type: 'SET_SOLVER_LOCK_DETAILS', details })
    }, [])

    // Source chain polling params
    const userLockParams = useMemo(() => {
        if (!state.hashlock || !state.srcContract || !state.chainId) return null
        return {
            type: getLockType(state.tokenContractAddress),
            id: state.hashlock,
            chainId: state.chainId,
            contractAddress: state.srcContract,
            txId: state.txId ?? undefined,
        }
    }, [state.hashlock, state.srcContract, state.chainId, state.tokenContractAddress, state.txId])

    // Destination chain polling params
    const solverLockParams = useMemo(() => {
        if (!state.hashlock || !state.destContract) return null
        const destChainId = state.destinationNetwork?.split(':')[1] ?? null
        return {
            type: getLockType(state.quote?.route?.destination?.tokenContract ?? state.destinationAsset),
            id: state.hashlock,
            chainId: destChainId,
            contractAddress: state.destContract,
            solverAddress: state.quote?.destinationSolverAddress,
        }
    }, [state.hashlock, state.destContract, state.destinationNetwork, state.quote, state.destinationAsset])

    // Resolve destination chain node URLs for solver lock verification
    const destNodeUrls = useMemo(() => {
        if (!state.destinationNetwork || !config.resolveNodeUrls) return []
        return config.resolveNodeUrls(state.destinationNetwork)
    }, [state.destinationNetwork, config.resolveNodeUrls])

    // Create read-only HTLC clients for polling (using adapter config for rpcUrl etc.)
    const sourceReadClient = useMemo(() => {
        if (!sourceNamespace) return null
        try {
            const adapterConfig = walletCtx.getClientConfig(sourceNamespace)
            return sdk.createHTLCClient(sourceNamespace, { ...adapterConfig } as any)
        } catch { return null }
    }, [sourceNamespace, walletCtx])

    const destReadClient = useMemo(() => {
        if (!destNamespace) return null
        try {
            const adapterConfig = walletCtx.getClientConfig(destNamespace)
            return sdk.createHTLCClient(destNamespace, { ...adapterConfig } as any)
        } catch { return null }
    }, [destNamespace, walletCtx])

    // Activate polling hooks
    useUserLockPolling({
        client: sourceReadClient,
        params: userLockParams,
        enabled: isActive,
        onSuccess: onSourceDetails,
    })

    const onConsensusFailed = useCallback((error: Error) => {
        const trainError = error instanceof TrainError
            ? error
            : new TrainError(error.message, TrainErrorCode.VerificationFailed, error)
        dispatch({ type: 'SET_ERROR', error: trainError })
        config.onError?.(trainError)
    }, [config])

    const { consensusVerifying, consensusVerified } = useSolverLockPolling({
        client: destReadClient,
        params: solverLockParams,
        nodeUrls: destNodeUrls,
        enabled: isActive && status !== HTLCStatus.Initial,
        onSuccess: onSolverLockDetails,
        onConsensusFailed,
    })

    // Order streaming
    const destRedeemTx = state.htlcFromApi?.transactions?.find(
        t => t.type === 'HTLCRedeem' && t.network === state.destinationNetwork
    )

    useOrderStream({
        baseUrl: config.baseUrl,
        solverId: state.solverId ?? undefined,
        hashlock: state.hashlock ?? undefined,
        enabled: isActive && !!state.solverLockDetails && !destRedeemTx,
        onOrder: useCallback((order: HTLCFromApi) => {
            dispatch({ type: 'SET_ORDER', order })

            // Check for dest redeem tx
            const redeemTx = order.transactions?.find(
                t => t.type === 'HTLCRedeem'
            )
            if (redeemTx) {
                dispatch({ type: 'SET_DEST_REDEEM_TX', txId: redeemTx.hash })
            }
        }, []),
    })

    // Manual claim timer: 3 minutes after source redeemed but dest not
    useEffect(() => {
        if (
            state.sourceDetails?.status === LockStatus.Redeemed &&
            state.solverLockDetails &&
            state.solverLockDetails.status !== LockStatus.Redeemed &&
            !state.manualClaimRequired
        ) {
            manualClaimTimerRef.current = setTimeout(() => {
                dispatch({ type: 'MANUAL_CLAIM_REQUIRED' })
            }, 3 * 60 * 1000)
        }

        return () => {
            if (manualClaimTimerRef.current) {
                clearTimeout(manualClaimTimerRef.current)
                manualClaimTimerRef.current = null
            }
        }
    }, [state.sourceDetails?.status, state.solverLockDetails, state.manualClaimRequired])

    // Sync status to swap store
    useEffect(() => {
        if (state.hashlock && store) {
            store.getState().updateSwap(state.hashlock, {
                status,
                destTxId: state.destRedeemTxId ?? undefined,
                createdAt: state.sourceDetails?.blockTimestamp,
                timelock: state.sourceDetails?.timelock,
            })
        }
    }, [status, state.hashlock, state.destRedeemTxId, state.sourceDetails?.blockTimestamp, state.sourceDetails?.timelock, store])

    // --- Actions ---

    const startSwap = useCallback(async (params: StartSwapParams, derivedKey: Uint8Array) => {
        try {
            const nonce = Date.now()
            const secretBytes = deriveSecretFromTimelock(derivedKey, nonce)
            const secret = '0x' + Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('')
            const hashlock = secretToHashlock(secret)

            dispatch({
                type: 'SET_PARAMS',
                payload: {
                    sourceNetwork: params.sourceNetwork,
                    destinationNetwork: params.destinationNetwork,
                    srcContract: params.srcContract,
                    destContract: params.destContract,
                    tokenContractAddress: params.tokenContractAddress ?? null,
                    sourceAddress: params.sourceAddress,
                    destinationAddress: params.destinationAddress,
                    chainId: params.chainId ?? params.sourceNetwork.split(':')[1],
                    solverId: params.solverId,
                    sourceAsset: params.sourceAsset,
                    destinationAsset: params.destinationAsset,
                    quote: params.quote,
                    requestedAmount: params.amount,
                },
            })

            // Get signer from wallet adapter
            const namespace = params.sourceNetwork.split(':')[0]
            const signer = walletCtx.getSigner(namespace)
            if (!signer) {
                throw new TrainError(
                    `No wallet adapter registered for ${namespace}`,
                    TrainErrorCode.WalletNotConnected,
                )
            }

            // Create write client with signer + adapter config (rpcUrl, chainId, etc.)
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

            dispatch({
                type: 'USER_LOCKED',
                hashlock: result.hashlock,
                txId: result.hash,
                nonce,
                secret,
            })

            // Commit currentSwap to persisted store
            if (store) {
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
            dispatch({ type: 'SET_ERROR', error })
            config.onError?.(error)
            throw error
        }
    }, [apiClient, walletCtx, store, config, sdk])

    const revealSecret = useCallback(async () => {
        if (!state.solverId || !state.hashlock || !state.secret) {
            console.error('[SwapProvider.revealSecret] MISSING:', { solverId: !!state.solverId, hashlock: !!state.hashlock, secret: !!state.secret })
            throw new TrainError('Cannot reveal: missing solverId, hashlock, or secret', TrainErrorCode.RevealFailed)
        }

        // Verify solver lock before revealing
        if (state.solverLockDetails && state.quote) {
            const verification = verifySolverLock({
                solverLockDetails: state.solverLockDetails,
                expectedReceiveAmount: state.solverLockDetails.amount,
                expectedRecipient: state.destinationAddress ?? '',
                expectedToken: state.quote.route?.destination?.tokenContract,
            })
            if (!verification.verified && !verification.skipped) {
                throw new TrainError(
                    `Solver lock verification failed: ${verification.mismatches.join(', ')}`,
                    TrainErrorCode.VerificationFailed,
                )
            }
        }

        try {
            await apiClient.revealSecret(state.solverId, state.hashlock, state.secret)
            dispatch({ type: 'SECRET_REVEALED' })

            if (store && state.hashlock) {
                store.getState().updateSwap(state.hashlock, { secretRevealed: true })
            }
        } catch (err) {
            console.error('[SwapProvider.revealSecret] FAILED:', err)
            const error = new TrainError(
                err instanceof Error ? err.message : String(err),
                TrainErrorCode.RevealFailed,
                err,
            )
            dispatch({ type: 'SET_ERROR', error })
            config.onError?.(error)
            throw error
        }
    }, [state.solverId, state.hashlock, state.secret, state.solverLockDetails, state.quote, state.destinationAddress, apiClient, store, config])

    const refund = useCallback(async (): Promise<string> => {
        if (!state.hashlock || !sourceNamespace || !state.srcContract || !state.sourceAsset) {
            throw new TrainError('Cannot refund: missing required params', TrainErrorCode.RefundFailed)
        }

        try {
            const signer = walletCtx.getSigner(sourceNamespace)
            if (!signer) {
                throw new TrainError(`No wallet adapter for ${sourceNamespace}`, TrainErrorCode.WalletNotConnected)
            }

            const adapterConfig = walletCtx.getClientConfig(sourceNamespace)
            const client = sdk.createHTLCClient(sourceNamespace, { ...adapterConfig, signer } as any)
            const txHash = await client.refund({
                type: getLockType(state.tokenContractAddress),
                chainId: state.chainId,
                contractAddress: state.srcContract,
                id: state.hashlock,
                sourceAsset: state.sourceAsset,
            })

            if (store && state.hashlock) {
                store.getState().updateSwap(state.hashlock, { refundTxId: txHash })
            }

            return txHash
        } catch (err) {
            const error = err instanceof TrainError
                ? err
                : new TrainError(err instanceof Error ? err.message : String(err), TrainErrorCode.RefundFailed, err)
            dispatch({ type: 'SET_ERROR', error })
            config.onError?.(error)
            throw error
        }
    }, [state.hashlock, state.srcContract, state.sourceAsset, state.tokenContractAddress, state.chainId, sourceNamespace, walletCtx, sdk, store, config])

    const manualClaim = useCallback(async (secret: string): Promise<string> => {
        if (!state.hashlock || !destNamespace || !state.destContract || !state.quote) {
            throw new TrainError('Cannot claim: missing required params', TrainErrorCode.ClaimFailed)
        }

        try {
            const signer = walletCtx.getSigner(destNamespace)
            if (!signer) {
                throw new TrainError(`No wallet adapter for ${destNamespace}`, TrainErrorCode.WalletNotConnected)
            }

            const adapterConfig = walletCtx.getClientConfig(destNamespace)
            const client = sdk.createHTLCClient(destNamespace, { ...adapterConfig, signer } as any)
            const txHash = await client.redeemSolver({
                type: getLockType(state.quote.route?.destination?.tokenContract),
                chainId: state.destinationNetwork?.split(':')[1] ?? null,
                contractAddress: state.destContract,
                id: state.hashlock,
                secret,
                sourceAsset: state.sourceAsset!,
                destLpAddress: state.quote.destinationSolverAddress,
                destinationAddress: state.destinationAddress ?? undefined,
            })

            dispatch({ type: 'SET_DEST_REDEEM_TX', txId: txHash })

            if (store && state.hashlock) {
                store.getState().updateSwap(state.hashlock, { destTxId: txHash })
            }

            return txHash
        } catch (err) {
            const error = err instanceof TrainError
                ? err
                : new TrainError(err instanceof Error ? err.message : String(err), TrainErrorCode.ClaimFailed, err)
            dispatch({ type: 'SET_ERROR', error })
            config.onError?.(error)
            throw error
        }
    }, [state.hashlock, state.destContract, state.quote, state.sourceAsset, state.destinationAddress, state.destinationNetwork, destNamespace, walletCtx, sdk, store, config])

    const recoverSwapFromTx = useCallback(async (txHash: string, chainNamespace: string, rpcUrl: string) => {
        try {
            const adapterConfig = walletCtx.getClientConfig(chainNamespace)
            const client = sdk.createHTLCClient(chainNamespace, { ...adapterConfig, rpcUrl } as any)
            const recovered = await client.recoverSwap(txHash)

            dispatch({
                type: 'SET_PARAMS',
                payload: {
                    hashlock: recovered.hashlock,
                    sourceNetwork: recovered.srcChain,
                    destinationNetwork: recovered.dstChain,
                    srcContract: recovered.srcContract,
                    sourceAddress: recovered.sender,
                    destinationAddress: recovered.dstAddress,
                },
            })

            if (store) {
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
            dispatch({ type: 'SET_ERROR', error })
            config.onError?.(error)
            throw error
        }
    }, [sdk, walletCtx, store, config])

    const resumeSwap = useCallback((params: ResumeSwapParams) => {
        dispatch({ type: 'RESET' })
        dispatch({
            type: 'SET_PARAMS',
            payload: {
                hashlock: params.hashlock,
                txId: params.txId ?? null,
                sourceNetwork: params.sourceNetwork,
                destinationNetwork: params.destinationNetwork,
                srcContract: params.srcContract ?? null,
                destContract: params.destContract ?? null,
                tokenContractAddress: params.tokenContractAddress ?? null,
                sourceAddress: params.sourceAddress ?? null,
                destinationAddress: params.destinationAddress ?? null,
                chainId: params.chainId ?? params.sourceNetwork.split(':')[1],
                solverId: params.solverId ?? null,
                sourceAsset: params.sourceAsset ?? null,
                destinationAsset: params.destinationAsset ?? null,
                requestedAmount: params.requestedAmount ?? null,
                secretRevealed: params.secretRevealed ?? false,
            },
        })
    }, [])

    const setError = useCallback((error: Error | null) => {
        if (error) {
            dispatch({ type: 'SET_ERROR', error })
        } else {
            dispatch({ type: 'SET_PARAMS', payload: { error: null } })
        }
    }, [])

    const setCurrentSwap = useCallback((data: SwapData) => {
        dispatch({ type: 'RESET' })
        if (store) {
            store.getState().setCurrentSwap(data)
        }
    }, [store])

    const reset = useCallback(() => {
        dispatch({ type: 'RESET' })
    }, [])

    const value = useMemo<SwapContextValue>(() => ({
        status,
        hashlock: state.hashlock,
        sourceDetails: state.sourceDetails,
        solverLockDetails: state.solverLockDetails,
        htlcFromApi: state.htlcFromApi,
        secretRevealed: state.secretRevealed,
        isTimelockExpired,
        manualClaimRequired: state.manualClaimRequired,
        destRedeemTxId: state.destRedeemTxId,
        error: state.error,
        consensusVerifying,
        consensusVerified,
        setCurrentSwap,
        startSwap,
        resumeSwap,
        revealSecret,
        refund,
        manualClaim,
        recoverSwap: recoverSwapFromTx,
        setError,
        reset,
    }), [status, state, isTimelockExpired, consensusVerifying, consensusVerified, setCurrentSwap, startSwap, resumeSwap, revealSecret, refund, manualClaim, recoverSwapFromTx, setError, reset])

    return (
        <SwapContext.Provider value={value}>
            {children}
        </SwapContext.Provider>
    )
}
