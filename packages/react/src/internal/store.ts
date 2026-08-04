import { createStore as createZustandStore } from 'zustand/vanilla'
import { persist, type PersistStorage } from 'zustand/middleware'
import type { SwapData, SwapStorage, TrainError } from '../types'
import type { HTLCFromApi } from '@train-protocol/sdk'


// --- Swap flags (in-memory, mutated during lifecycle) ---

export type ConsensusPhase = 'none' | 'detecting' | 'verifying' | 'verified' | 'failed'

/** Which channel produced (or is producing) the solver-lock verification verdict. */
export type VerificationSource = 'rpc' | 'lightClient' | 'manual'

export interface SwapFlags {
    secretRevealedToApi: boolean
    consensusPhase: ConsensusPhase
    manualConsensusOverrideAllowed: boolean
    /** Number of agreeing RPC nodes. Meaningful only when verificationSource is 'rpc'. */
    verifiedNodeCount: number
    verificationSource: VerificationSource
    error: TrainError | null
    manualClaimStartedAt: number | null
}

const DEFAULT_FLAGS: SwapFlags = {
    secretRevealedToApi: false,
    consensusPhase: 'none',
    manualConsensusOverrideAllowed: false,
    verifiedNodeCount: 0,
    verificationSource: 'rpc',
    error: null,
    manualClaimStartedAt: null,
}

// --- Store ---

export interface SwapStoreState {
    // Persisted
    swaps: Record<string, SwapData>

    // Ephemeral — keyed by hashlock
    swapFlags: Record<string, SwapFlags>
    orderData: Record<string, HTLCFromApi>
    /** Subscriber count per hashlock — tracks how many useSwapProgress instances are watching */
    swapSubscribers: Record<string, number>

    // Persisted swap actions
    addSwap: (hashlock: string, data: SwapData) => void
    updateSwap: (hashlock: string, updates: Partial<SwapData>) => void
    clearSwap: (hashlock: string) => void
    /** Find an existing swap by source network + txHash (case-insensitive). Returns [hashlock, SwapData] or null. */
    findSwapByTx: (sourceNetwork: string, txHash: string) => [string, SwapData] | null

    // Subscriber actions
    /** Increment subscriber count. On first subscriber, initializes flags from persisted data if not already present. */
    subscribe: (hashlock: string) => void
    /** Decrement subscriber count. On last unsubscribe, removes all ephemeral state (flags + orderData). */
    unsubscribe: (hashlock: string) => void

    // Flag actions
    /** Update one or more flags for a swap. `manualClaimStartedAt` is write-once (ignored if already set). */
    updateSwapFlags: (hashlock: string, updates: Partial<SwapFlags>) => void
    /**
     * User-driven override of a failed solver-lock consensus check.
     * Flips consensusPhase to 'verified' with verificationSource 'manual'
     * and clears any verification error so the auto-reveal flow can proceed.
     */
    markVerifiedManually: (hashlock: string) => void

    // Order data (SSE stream)
    setOrderData: (hashlock: string, data: HTLCFromApi) => void

    // Convenience accessors (point-in-time reads without selector boilerplate)
    getSwap: (hashlock: string) => SwapData | undefined
    getSwapFlags: (hashlock: string) => SwapFlags | undefined
    getOrderData: (hashlock: string) => HTLCFromApi | undefined
}

const STORAGE_KEY = 'train:swaps'

const initialState = {
    swaps: {} as Record<string, SwapData>,
    swapFlags: {} as Record<string, SwapFlags>,
    orderData: {} as Record<string, HTLCFromApi>,
    swapSubscribers: {} as Record<string, number>,
}

type SetFn = (fn: SwapStoreState | Partial<SwapStoreState> | ((state: SwapStoreState) => SwapStoreState | Partial<SwapStoreState>)) => void
type GetFn = () => SwapStoreState

/** Helper to update a single swap flags entry immutably */
function updateFlags(
    state: SwapStoreState,
    hashlock: string,
    updater: (flags: SwapFlags) => SwapFlags,
): Partial<SwapStoreState> {
    const flags = state.swapFlags[hashlock]
    if (!flags) return state
    return { swapFlags: { ...state.swapFlags, [hashlock]: updater(flags) } }
}

function createActions(set: SetFn, get: GetFn) {
    return {
        // --- Persisted swap actions ---
        addSwap: (hashlock: string, data: SwapData) =>
            set((state) => ({
                swaps: { ...state.swaps, [hashlock]: { ...data, hashlock, createdAt: Date.now() } },
                swapFlags: { ...state.swapFlags, [hashlock]: state.swapFlags[hashlock] ?? { ...DEFAULT_FLAGS } },
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

        findSwapByTx: (sourceNetwork: string, txHash: string): [string, SwapData] | null => {
            const { swaps } = get()
            const upperNetwork = sourceNetwork.toUpperCase()
            const upperTxHash = txHash.toUpperCase()
            const entry = Object.entries(swaps).find(([, swap]) =>
                swap.source?.toUpperCase() === upperNetwork &&
                swap.txId?.toUpperCase() === upperTxHash
            )
            return entry ? [entry[0], entry[1]] as [string, SwapData] : null
        },

        // --- Subscriber actions ---
        subscribe: (hashlock: string) =>
            set((state) => {
                const count = (state.swapSubscribers[hashlock] ?? 0) + 1
                const updates: Partial<SwapStoreState> = {
                    swapSubscribers: { ...state.swapSubscribers, [hashlock]: count },
                }

                // First subscriber — initialize flags from persisted data if not already present
                if (count === 1 && !state.swapFlags[hashlock] && state.swaps[hashlock]) {
                    const swap = state.swaps[hashlock]
                    updates.swapFlags = {
                        ...state.swapFlags,
                        [hashlock]: {
                            ...DEFAULT_FLAGS,
                            secretRevealedToApi: swap.secretRevealed ?? false,
                        },
                    }
                }

                return updates
            }),

        unsubscribe: (hashlock: string) =>
            set((state) => {
                const count = (state.swapSubscribers[hashlock] ?? 1) - 1
                if (count > 0) {
                    return { swapSubscribers: { ...state.swapSubscribers, [hashlock]: count } }
                }

                // Last subscriber — clean up all ephemeral state
                const { [hashlock]: _s, ...restSubs } = state.swapSubscribers
                const { [hashlock]: _f, ...restFlags } = state.swapFlags
                const { [hashlock]: _o, ...restOrders } = state.orderData
                return {
                    swapSubscribers: restSubs,
                    swapFlags: restFlags,
                    orderData: restOrders,
                }
            }),

        // --- Flag actions ---
        updateSwapFlags: (hashlock: string, updates: Partial<SwapFlags>) =>
            set((state) => updateFlags(state, hashlock, (flags) => {
                // manualClaimStartedAt is write-once
                if (updates.manualClaimStartedAt && flags.manualClaimStartedAt) {
                    const { manualClaimStartedAt: _, ...rest } = updates
                    return { ...flags, ...rest }
                }
                return { ...flags, ...updates }
            })),

        markVerifiedManually: (hashlock: string) =>
            set((state) => updateFlags(state, hashlock, (flags) => {
                if (!flags.manualConsensusOverrideAllowed) return flags
                return {
                    ...flags,
                    consensusPhase: 'verified',
                    manualConsensusOverrideAllowed: false,
                    verifiedNodeCount: 0,
                    verificationSource: 'manual',
                    error: null,
                }
            })),

        // --- Order data ---
        setOrderData: (hashlock: string, data: HTLCFromApi) =>
            set((state) => ({
                orderData: { ...state.orderData, [hashlock]: data },
            })),

        // --- Convenience accessors ---
        getSwap: (hashlock: string) => get().swaps[hashlock],
        getSwapFlags: (hashlock: string) => get().swapFlags[hashlock],
        getOrderData: (hashlock: string) => get().orderData[hashlock],
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
                return raw.then(v => {
                    if (!v) return null
                    try { return JSON.parse(v) } catch { return null }
                })
            }
            if (!raw) return null
            try { return JSON.parse(raw) } catch { return null }
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
        return createZustandStore<SwapStoreState>()((set, get) => ({
            ...initialState,
            ...createActions(set, get),
        }))
    }

    const persistStorage = createPersistStorage(options?.storage)

    return createZustandStore<SwapStoreState>()(
        persist(
            (set, get) => ({
                ...initialState,
                ...createActions(set, get),
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
