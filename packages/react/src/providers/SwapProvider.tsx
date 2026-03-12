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
    createHTLCClient,
    deriveSecretFromTimelock,
    secretToHashlock,
} from '@train-protocol/sdk'
import type {
    LockDetails,
    IHTLCClient,
    HTLCFromApi,
    QuoteDetails,
    Token,
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

// --- State ---

interface SwapState {
    status: HTLCStatus
    hashlock: string | null
    nonce: number | null
    secret: string | null
    solverId: string | null
    sourceDetails: LockDetails | null
    solverLockDetails: LockDetails | null
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
    | { type: 'SET_SOURCE_DETAILS'; details: LockDetails }
    | { type: 'SET_SOLVER_LOCK_DETAILS'; details: LockDetails }
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

export interface SwapContextValue {
    status: HTLCStatus
    hashlock: string | null
    sourceDetails: LockDetails | null
    solverLockDetails: LockDetails | null
    htlcFromApi: HTLCFromApi | null
    secretRevealed: boolean
    isTimelockExpired: boolean
    manualClaimRequired: boolean
    destRedeemTxId: string | null
    error: Error | null

    startSwap: (params: StartSwapParams, derivedKey: Buffer) => Promise<void>
    revealSecret: () => Promise<void>
    refund: () => Promise<string>
    manualClaim: (secret: string) => Promise<string>
    recoverSwap: (txHash: string, chainNamespace: string, rpcUrl: string) => Promise<void>
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
    const { apiClient, config } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
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

    // Whether polling should be active
    const isActive = !!state.hashlock && status !== HTLCStatus.RedeemCompleted && status !== HTLCStatus.Refunded

    // Polling callbacks
    const onSourceDetails = useCallback((details: LockDetails) => {
        dispatch({ type: 'SET_SOURCE_DETAILS', details })
    }, [])

    const onSolverLockDetails = useCallback((details: LockDetails) => {
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
            type: getLockType(state.quote?.route?.destination?.tokenContract),
            id: state.hashlock,
            chainId: destChainId,
            contractAddress: state.destContract,
            solverAddress: state.quote?.destinationSolverAddress,
        }
    }, [state.hashlock, state.destContract, state.destinationNetwork, state.quote])

    // Create read-only HTLC clients for polling
    const sourceReadClient = useMemo(() => {
        if (!sourceNamespace) return null
        try {
            return createHTLCClient(sourceNamespace, { apiClient } as any)
        } catch { return null }
    }, [sourceNamespace, apiClient])

    const destReadClient = useMemo(() => {
        if (!destNamespace) return null
        try {
            return createHTLCClient(destNamespace, { apiClient } as any)
        } catch { return null }
    }, [destNamespace, apiClient])

    // Activate polling hooks
    useUserLockPolling({
        client: sourceReadClient,
        params: userLockParams,
        enabled: isActive,
        onSuccess: onSourceDetails,
    })

    useSolverLockPolling({
        client: destReadClient,
        params: solverLockParams,
        nodeUrls: [],
        enabled: isActive && status !== HTLCStatus.Initial,
        onSuccess: onSolverLockDetails,
    })

    // Order streaming
    const destRedeemTx = state.htlcFromApi?.transactions?.find(
        t => t.type === 'HTLCRedeem' && t.networkId === state.destinationNetwork
    )

    useOrderStream({
        baseUrl: config.baseUrl,
        solverId: state.solverId ?? undefined,
        hashlock: state.hashlock ?? undefined,
        enabled: isActive && !destRedeemTx,
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

    const startSwap = useCallback(async (params: StartSwapParams, derivedKey: Buffer) => {
        try {
            const nonce = Date.now()
            const secretBuf = deriveSecretFromTimelock(derivedKey, nonce)
            const secret = '0x' + secretBuf.toString('hex')
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

            // Create write client with signer
            const client = createHTLCClient(namespace, {
                signer,
                apiClient,
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

            // Commit to store
            if (store) {
                const swapData: SwapData = {
                    requestedAmount: params.amount,
                    address: params.sourceAddress,
                    source: params.sourceNetwork,
                    destination: params.destinationNetwork,
                    source_asset: params.sourceAsset.symbol,
                    destination_asset: params.destinationAsset,
                    solver: params.solverId,
                    srcContract: params.srcContract,
                    destContract: params.destContract,
                    receiveAmount: params.quote.receiveAmount,
                    sourceSolverAddress: params.quote.sourceSolverAddress,
                    destinationSolverAddress: params.quote.destinationSolverAddress,
                }
                store.getState().commitSwap(result.hashlock, result.hash, swapData)
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
    }, [apiClient, walletCtx, store, config])

    const revealSecret = useCallback(async () => {
        if (!state.solverId || !state.hashlock || !state.secret) {
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

            const client = createHTLCClient(sourceNamespace, { signer, apiClient } as any)
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
    }, [state.hashlock, state.srcContract, state.sourceAsset, state.tokenContractAddress, state.chainId, sourceNamespace, walletCtx, apiClient, store, config])

    const manualClaim = useCallback(async (secret: string): Promise<string> => {
        if (!state.hashlock || !destNamespace || !state.destContract || !state.quote) {
            throw new TrainError('Cannot claim: missing required params', TrainErrorCode.ClaimFailed)
        }

        try {
            const signer = walletCtx.getSigner(destNamespace)
            if (!signer) {
                throw new TrainError(`No wallet adapter for ${destNamespace}`, TrainErrorCode.WalletNotConnected)
            }

            const client = createHTLCClient(destNamespace, { signer, apiClient } as any)
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
    }, [state.hashlock, state.destContract, state.quote, state.sourceAsset, state.destinationAddress, state.destinationNetwork, destNamespace, walletCtx, apiClient, store, config])

    const recoverSwapFromTx = useCallback(async (txHash: string, chainNamespace: string, rpcUrl: string) => {
        try {
            const client = createHTLCClient(chainNamespace, { rpcUrl, apiClient } as any)
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
    }, [apiClient, store, config])

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
        startSwap,
        revealSecret,
        refund,
        manualClaim,
        recoverSwap: recoverSwapFromTx,
        reset,
    }), [status, state, isTimelockExpired, startSwap, revealSecret, refund, manualClaim, recoverSwapFromTx, reset])

    return (
        <SwapContext.Provider value={value}>
            {children}
        </SwapContext.Provider>
    )
}
