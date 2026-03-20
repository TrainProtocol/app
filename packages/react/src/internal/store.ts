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
    destinationAsset: string | null
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

// --- Store ---

export interface SwapStoreState {
    // Persisted
    swaps: Record<string, SwapData>
    activeHashlock: string | null
    currentSwap: SwapData | null

    // Ephemeral (not persisted)
    activeSwap: ActiveSwapState | null

    // Persisted swap actions
    setActiveHashlock: (hashlock: string | null) => void
    setCurrentSwap: (data: SwapData) => void
    clearCurrentSwap: () => void
    commitSwap: (hashlock: string, txId: string) => void
    updateSwap: (hashlock: string, updates: Partial<SwapData>) => void
    recoverSwap: (hashlock: string, data: SwapData) => void
    clearSwap: (hashlock: string) => void

    // Active swap actions
    initActiveSwap: (params: Omit<ActiveSwapState, 'sourceDetails' | 'solverLockDetails' | 'htlcFromApi' | 'secretRevealedToApi' | 'consensusPhase' | 'error' | 'manualClaimStartedAt'> & { secretRevealed?: boolean }) => void
    setSourceDetails: (details: UserLockDetails) => void
    setSolverLockDetails: (details: SolverLockDetails) => void
    setConsensusPhase: (phase: ConsensusPhase) => void
    setHtlcFromApi: (order: HTLCFromApi) => void
    setSecretRevealedToApi: () => void
    setActiveSwapError: (error: Error | null) => void
    setSecretAndNonce: (secret: string, nonce: number) => void
    setManualClaimStartedAt: (timestamp: number) => void
    resetActiveSwap: () => void
}

const STORAGE_KEY = 'train:swaps'

const initialState = {
    swaps: {} as Record<string, SwapData>,
    activeHashlock: null as string | null,
    currentSwap: null as SwapData | null,
    activeSwap: null as ActiveSwapState | null,
}

type SetFn = (fn: SwapStoreState | Partial<SwapStoreState> | ((state: SwapStoreState) => SwapStoreState | Partial<SwapStoreState>)) => void

function createActions(set: SetFn) {
    return {
        // --- Persisted swap actions (unchanged) ---
        setActiveHashlock: (hashlock: string | null) => set({ activeHashlock: hashlock }),
        setCurrentSwap: (data: SwapData) => set({ currentSwap: data, activeHashlock: null }),
        clearCurrentSwap: () => set({ currentSwap: null }),
        commitSwap: (hashlock: string, txId: string) =>
            set((state) => {
                const data = state.currentSwap
                if (!data) return state
                return {
                    currentSwap: null,
                    swaps: { ...state.swaps, [hashlock]: { ...data, hashlock, txId, createdAt: Date.now() } },
                    activeHashlock: hashlock,
                }
            }),
        updateSwap: (hashlock: string, updates: Partial<SwapData>) =>
            set((state) => {
                if (!state.swaps[hashlock]) return state
                return {
                    swaps: { ...state.swaps, [hashlock]: { ...state.swaps[hashlock], ...updates } },
                }
            }),
        recoverSwap: (hashlock: string, data: SwapData) =>
            set((state) => {
                if (state.swaps[hashlock]) return state
                return {
                    swaps: { ...state.swaps, [hashlock]: data },
                    activeHashlock: hashlock,
                }
            }),
        clearSwap: (hashlock: string) =>
            set((state) => {
                const { [hashlock]: _, ...rest } = state.swaps
                return {
                    swaps: rest,
                    activeHashlock: state.activeHashlock === hashlock ? null : state.activeHashlock,
                }
            }),

        // --- Active swap actions ---
        initActiveSwap: (params: Omit<ActiveSwapState, 'sourceDetails' | 'solverLockDetails' | 'htlcFromApi' | 'secretRevealedToApi' | 'consensusPhase' | 'error' | 'manualClaimStartedAt'> & { secretRevealed?: boolean }) =>
            set({
                activeSwap: {
                    ...params,
                    sourceDetails: null,
                    solverLockDetails: null,
                    htlcFromApi: null,
                    secretRevealedToApi: params.secretRevealed ?? false,
                    consensusPhase: 'none',
                    error: null,
                    manualClaimStartedAt: null,
                },
            }),

        setSourceDetails: (details: UserLockDetails) =>
            set((state) => {
                if (!state.activeSwap) return state
                // Hashlock mismatch guard
                if (details.hashlock && details.hashlock.toLowerCase() !== state.activeSwap.hashlock.toLowerCase()) return state
                // Empty result guard (lock not yet mined — contract returns defaults with no sender)
                if (!details.sender) return state
                return { activeSwap: { ...state.activeSwap, sourceDetails: details } }
            }),

        setSolverLockDetails: (details: SolverLockDetails) =>
            set((state) => {
                if (!state.activeSwap) return state
                return { activeSwap: { ...state.activeSwap, solverLockDetails: details } }
            }),

        setConsensusPhase: (phase: ConsensusPhase) =>
            set((state) => {
                if (!state.activeSwap) return state
                return { activeSwap: { ...state.activeSwap, consensusPhase: phase } }
            }),

        setHtlcFromApi: (order: HTLCFromApi) =>
            set((state) => {
                if (!state.activeSwap) return state
                return { activeSwap: { ...state.activeSwap, htlcFromApi: order } }
            }),

        setSecretRevealedToApi: () =>
            set((state) => {
                if (!state.activeSwap) return state
                return { activeSwap: { ...state.activeSwap, secretRevealedToApi: true } }
            }),

        setActiveSwapError: (error: Error | null) =>
            set((state) => {
                if (!state.activeSwap) return state
                return { activeSwap: { ...state.activeSwap, error } }
            }),

        setSecretAndNonce: (secret: string, nonce: number) =>
            set((state) => {
                if (!state.activeSwap) return state
                return { activeSwap: { ...state.activeSwap, secret, nonce } }
            }),

        setManualClaimStartedAt: (timestamp: number) =>
            set((state) => {
                if (!state.activeSwap) return state
                if (state.activeSwap.manualClaimStartedAt) return state // only set once
                return { activeSwap: { ...state.activeSwap, manualClaimStartedAt: timestamp } }
            }),

        resetActiveSwap: () => set({ activeSwap: null }),
    }
}

function createPersistStorage(storage?: SwapStorage): PersistStorage<Pick<SwapStoreState, 'swaps' | 'activeHashlock'>> | undefined {
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
                    activeHashlock: state.activeHashlock,
                }),
            },
        ),
    )
}

export type SwapStore = ReturnType<typeof createSwapStore>
