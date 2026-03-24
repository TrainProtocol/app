import { createStore as createZustandStore } from 'zustand/vanilla'
import { persist, type PersistStorage } from 'zustand/middleware'
import type { SwapData, SwapStorage } from '../types'
import type { UserLockDetails, SolverLockDetails, HTLCFromApi, QuoteDetails, Token } from '@train-protocol/sdk'

// --- Active swap (in-memory, not persisted) ---

export type ConsensusPhase = 'none' | 'detecting' | 'verifying' | 'verified' | 'failed'

export interface ActiveSwapState {
    // Identity / config (set at start or resume)
    hashlock: string
    nonce: number | null
    secret: string | null
    solverId: string | null
    sourceNetwork: string
    destinationNetwork: string
    srcContract: string | null
    destContract: string | null
    tokenContractAddress: string | null
    sourceAddress: string | null
    destinationAddress: string | null
    chainId: string | null
    txId: string | null
    sourceAsset: Token | null
    destinationAsset: Token | null
    quote: QuoteDetails | null
    requestedAmount: string | null

    // Raw on-chain / API data (written by polling hooks)
    sourceDetails: UserLockDetails | null
    solverLockDetails: SolverLockDetails | null
    htlcFromApi: HTLCFromApi | null

    // Local flags (written by actions)
    secretRevealedToApi: boolean
    consensusPhase: ConsensusPhase
    error: Error | null
    manualClaimStartedAt: number | null
}

export type InitActiveSwapParams = Omit<
    ActiveSwapState,
    'sourceDetails' | 'solverLockDetails' | 'htlcFromApi' | 'secretRevealedToApi' | 'consensusPhase' | 'error' | 'manualClaimStartedAt'
> & { secretRevealed?: boolean }

// --- Store ---

export interface SwapStoreState {
    // Persisted
    swaps: Record<string, SwapData>

    // Ephemeral (not persisted) — keyed by hashlock
    activeSwaps: Record<string, ActiveSwapState>

    // Persisted swap actions
    addSwap: (hashlock: string, data: SwapData) => void
    updateSwap: (hashlock: string, updates: Partial<SwapData>) => void
    clearSwap: (hashlock: string) => void

    // Active swap actions (all hashlock-scoped)
    /** Activate monitoring for a persisted swap. Reads swaps[hashlock] and builds active state. No-op if already active or not persisted. */
    activateSwap: (hashlock: string) => void
    /** Low-level init with full params — used by useCreateSwap/useRecoverSwap where extra data (secret, quote, assets) is available. */
    initActiveSwap: (hashlock: string, params: InitActiveSwapParams) => void
    removeActiveSwap: (hashlock: string) => void
    setSourceDetails: (hashlock: string, details: UserLockDetails) => void
    setSolverLockDetails: (hashlock: string, details: SolverLockDetails) => void
    setConsensusPhase: (hashlock: string, phase: ConsensusPhase) => void
    setHtlcFromApi: (hashlock: string, order: HTLCFromApi) => void
    setSecretRevealedToApi: (hashlock: string) => void
    setActiveSwapError: (hashlock: string, error: Error | null) => void
    setSecretAndNonce: (hashlock: string, secret: string, nonce: number) => void
    setManualClaimStartedAt: (hashlock: string, timestamp: number) => void
}

const STORAGE_KEY = 'train:swaps'

const initialState = {
    swaps: {} as Record<string, SwapData>,
    activeSwaps: {} as Record<string, ActiveSwapState>,
}

type SetFn = (fn: SwapStoreState | Partial<SwapStoreState> | ((state: SwapStoreState) => SwapStoreState | Partial<SwapStoreState>)) => void

/** Helper to update a single active swap entry immutably */
function updateActive(
    state: SwapStoreState,
    hashlock: string,
    updater: (swap: ActiveSwapState) => ActiveSwapState,
): Partial<SwapStoreState> {
    const swap = state.activeSwaps[hashlock]
    if (!swap) return state
    return { activeSwaps: { ...state.activeSwaps, [hashlock]: updater(swap) } }
}

function createActions(set: SetFn) {
    return {
        // --- Persisted swap actions ---
        addSwap: (hashlock: string, data: SwapData) =>
            set((state) => ({
                swaps: { ...state.swaps, [hashlock]: { ...data, hashlock, createdAt: Date.now() } },
            })),

        updateSwap: (hashlock: string, updates: Partial<SwapData>) =>
            set((state) => {
                if (!state.swaps[hashlock]) return state
                return {
                    swaps: { ...state.swaps, [hashlock]: { ...state.swaps[hashlock], ...updates } },
                }
            }),

        clearSwap: (hashlock: string) =>
            set((state) => {
                const { [hashlock]: _, ...rest } = state.swaps
                return { swaps: rest }
            }),

        // --- Active swap actions (hashlock-scoped) ---
        activateSwap: (hashlock: string) =>
            set((state) => {
                // Already active or no persisted data — no-op
                if (state.activeSwaps[hashlock] || !state.swaps[hashlock]) return state
                const swap = state.swaps[hashlock]
                return {
                    activeSwaps: {
                        ...state.activeSwaps,
                        [hashlock]: {
                            hashlock,
                            nonce: null,
                            secret: null,
                            solverId: swap.solver ?? null,
                            sourceNetwork: swap.source ?? '',
                            destinationNetwork: swap.destination ?? '',
                            srcContract: swap.srcContract ?? null,
                            destContract: swap.destContract ?? null,
                            tokenContractAddress: null,
                            sourceAddress: swap.sourceAddress ?? swap.address ?? null,
                            destinationAddress: swap.destinationAddress ?? null,
                            chainId: swap.source?.split(':')[1] ?? null,
                            txId: swap.txId ?? null,
                            sourceAsset: null,
                            destinationAsset: null,
                            quote: null,
                            requestedAmount: swap.requestedAmount ?? null,
                            sourceDetails: null,
                            solverLockDetails: null,
                            htlcFromApi: null,
                            secretRevealedToApi: swap.secretRevealed ?? false,
                            consensusPhase: 'none',
                            error: null,
                            manualClaimStartedAt: null,
                        },
                    },
                }
            }),

        initActiveSwap: (hashlock: string, params: InitActiveSwapParams) =>
            set((state) => ({
                activeSwaps: {
                    ...state.activeSwaps,
                    [hashlock]: {
                        ...params,
                        sourceDetails: null,
                        solverLockDetails: null,
                        htlcFromApi: null,
                        secretRevealedToApi: params.secretRevealed ?? false,
                        consensusPhase: 'none',
                        error: null,
                        manualClaimStartedAt: null,
                    },
                },
            })),

        removeActiveSwap: (hashlock: string) =>
            set((state) => {
                const { [hashlock]: _, ...rest } = state.activeSwaps
                return { activeSwaps: rest }
            }),

        setSourceDetails: (hashlock: string, details: UserLockDetails) =>
            set((state) => updateActive(state, hashlock, (swap) => {
                if (details.hashlock && details.hashlock.toLowerCase() !== swap.hashlock.toLowerCase()) return swap
                if (!details.sender) return swap
                return { ...swap, sourceDetails: details }
            })),

        setSolverLockDetails: (hashlock: string, details: SolverLockDetails) =>
            set((state) => updateActive(state, hashlock, (swap) => ({ ...swap, solverLockDetails: details }))),

        setConsensusPhase: (hashlock: string, phase: ConsensusPhase) =>
            set((state) => updateActive(state, hashlock, (swap) => ({ ...swap, consensusPhase: phase }))),

        setHtlcFromApi: (hashlock: string, order: HTLCFromApi) =>
            set((state) => updateActive(state, hashlock, (swap) => ({ ...swap, htlcFromApi: order }))),

        setSecretRevealedToApi: (hashlock: string) =>
            set((state) => updateActive(state, hashlock, (swap) => ({ ...swap, secretRevealedToApi: true }))),

        setActiveSwapError: (hashlock: string, error: Error | null) =>
            set((state) => updateActive(state, hashlock, (swap) => ({ ...swap, error }))),

        setSecretAndNonce: (hashlock: string, secret: string, nonce: number) =>
            set((state) => updateActive(state, hashlock, (swap) => ({ ...swap, secret, nonce }))),

        setManualClaimStartedAt: (hashlock: string, timestamp: number) =>
            set((state) => updateActive(state, hashlock, (swap) => {
                if (swap.manualClaimStartedAt) return swap
                return { ...swap, manualClaimStartedAt: timestamp }
            })),
    }
}

function createPersistStorage(storage?: SwapStorage): PersistStorage<Pick<SwapStoreState, 'swaps'>> | undefined {
    if (typeof window === 'undefined' && !storage) return undefined

    const underlying = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
    if (!underlying) return undefined

    return {
        getItem: (name) => {
            const raw = underlying.getItem(name)
            if (raw instanceof Promise) {
                return raw.then(v => v ? JSON.parse(v) : null)
            }
            return raw ? JSON.parse(raw) : null
        },
        setItem: (name, value) => {
            underlying.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
            underlying.removeItem(name)
        },
    }
}

export function createSwapStore(options?: { persist?: boolean; storage?: SwapStorage }) {
    const shouldPersist = options?.persist !== false

    if (!shouldPersist) {
        return createZustandStore<SwapStoreState>()((set) => ({
            ...initialState,
            ...createActions(set),
        }))
    }

    const persistStorage = createPersistStorage(options?.storage)

    return createZustandStore<SwapStoreState>()(
        persist(
            (set) => ({
                ...initialState,
                ...createActions(set),
            }),
            {
                name: STORAGE_KEY,
                storage: persistStorage,
                partialize: (state) => ({
                    swaps: state.swaps,
                }),
            },
        ),
    )
}

export type SwapStore = ReturnType<typeof createSwapStore>
