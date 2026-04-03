import { createStore as createZustandStore } from 'zustand/vanilla'
import { persist, type PersistStorage } from 'zustand/middleware'
import type { SwapData, SwapStorage, TrainError } from '../types'
import type { HTLCFromApi, QuoteDetails } from '@train-protocol/sdk'
import type { Caip2Id, ChainReference } from './branded'
import { caip2Id, parseCaip2Id } from './branded'

// --- Swap config (in-memory, set once at creation/activation) ---

/** Fields common to all swap origins */
interface SwapConfigBase {
    hashlock: string
    sourceNetwork: Caip2Id
    destinationNetwork: Caip2Id
    srcContract: string
    sourceAddress: string
    destinationAddress: string
    txId: string
}

/** Config for a swap created through the normal quote flow */
export interface CreatedSwapConfig extends SwapConfigBase {
    origin: 'created'
    solverId: string
    destContract: string
    chainId: ChainReference
    tokenContractAddress: string | null
    quote: QuoteDetails
    requestedAmount: string
}

/** Config for a swap recovered from an on-chain transaction */
export interface RecoveredSwapConfig extends SwapConfigBase {
    origin: 'recovered'
    solverId?: undefined
    destContract?: undefined
    chainId?: undefined
    tokenContractAddress?: undefined
    quote?: undefined
    requestedAmount: string
}

/** Config hydrated from persisted swap data (page reload) */
export interface HydratedSwapConfig extends SwapConfigBase {
    origin: 'hydrated'
    solverId: string | null
    destContract: string | null
    chainId: ChainReference | null
    tokenContractAddress: string | null
    quote: null
    requestedAmount: string | null
}

export type SwapConfig = CreatedSwapConfig | RecoveredSwapConfig | HydratedSwapConfig

// --- Swap flags (in-memory, mutated during lifecycle) ---

export type ConsensusPhase = 'none' | 'detecting' | 'verifying' | 'verified' | 'failed'

export interface SwapFlags {
    secretRevealedToApi: boolean
    consensusPhase: ConsensusPhase
    error: TrainError | null
    manualClaimStartedAt: number | null
}

const DEFAULT_FLAGS: SwapFlags = {
    secretRevealedToApi: false,
    consensusPhase: 'none',
    error: null,
    manualClaimStartedAt: null,
}

// --- Store ---

export interface SwapStoreState {
    // Persisted
    swaps: Record<string, SwapData>

    // Ephemeral — keyed by hashlock
    swapConfigs: Record<string, SwapConfig>
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
    /** Increment subscriber count. On first subscriber, hydrates config from persisted data if not already present. */
    subscribe: (hashlock: string) => void
    /** Decrement subscriber count. On last unsubscribe, removes all ephemeral state (config + flags + orderData). */
    unsubscribe: (hashlock: string) => void

    // Config actions
    /** Set config directly — used by useCreateSwap/useRecoverSwap where extra data (quote, assets) is available. Also initializes default flags. */
    setSwapConfig: (hashlock: string, config: SwapConfig) => void

    // Flag actions
    setSecretRevealedToApi: (hashlock: string) => void
    setConsensusPhase: (hashlock: string, phase: ConsensusPhase) => void
    setActiveSwapError: (hashlock: string, error: TrainError | null) => void
    setManualClaimStartedAt: (hashlock: string, timestamp: number) => void

    // Order data (SSE stream)
    setOrderData: (hashlock: string, data: HTLCFromApi) => void
}

const STORAGE_KEY = 'train:swaps'

const initialState = {
    swaps: {} as Record<string, SwapData>,
    swapConfigs: {} as Record<string, SwapConfig>,
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

                // First subscriber — hydrate config from persisted data if not already present
                if (count === 1 && !state.swapConfigs[hashlock] && state.swaps[hashlock]) {
                    const swap = state.swaps[hashlock]
                    const sourceNet = swap.source ? caip2Id(swap.source) : caip2Id('eip155:0')
                    const destNet = swap.destination ? caip2Id(swap.destination) : caip2Id('eip155:0')
                    const hydrated: HydratedSwapConfig = {
                        origin: 'hydrated',
                        hashlock,
                        solverId: swap.solver ?? null,
                        sourceNetwork: sourceNet,
                        destinationNetwork: destNet,
                        srcContract: swap.srcContract ?? '',
                        destContract: swap.destContract ?? null,
                        tokenContractAddress: null,
                        sourceAddress: swap.sourceAddress ?? swap.address ?? '',
                        destinationAddress: swap.destinationAddress ?? '',
                        chainId: swap.source ? parseCaip2Id(sourceNet).reference : null,
                        txId: swap.txId ?? '',
                        quote: null,
                        requestedAmount: swap.requestedAmount ?? null,
                    }
                    updates.swapConfigs = {
                        ...state.swapConfigs,
                        [hashlock]: hydrated,
                    }
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
                const { [hashlock]: _c, ...restConfigs } = state.swapConfigs
                const { [hashlock]: _f, ...restFlags } = state.swapFlags
                const { [hashlock]: _o, ...restOrders } = state.orderData
                return {
                    swapSubscribers: restSubs,
                    swapConfigs: restConfigs,
                    swapFlags: restFlags,
                    orderData: restOrders,
                }
            }),

        // --- Config actions ---
        setSwapConfig: (hashlock: string, config: SwapConfig) =>
            set((state) => ({
                swapConfigs: {
                    ...state.swapConfigs,
                    [hashlock]: config,
                },
                swapFlags: {
                    ...state.swapFlags,
                    [hashlock]: state.swapFlags[hashlock] ?? { ...DEFAULT_FLAGS },
                },
            })),

        // --- Flag actions ---
        setSecretRevealedToApi: (hashlock: string) =>
            set((state) => updateFlags(state, hashlock, (flags) => ({ ...flags, secretRevealedToApi: true }))),

        setConsensusPhase: (hashlock: string, phase: ConsensusPhase) =>
            set((state) => updateFlags(state, hashlock, (flags) => ({ ...flags, consensusPhase: phase }))),

        setActiveSwapError: (hashlock: string, error: TrainError | null) =>
            set((state) => updateFlags(state, hashlock, (flags) => ({ ...flags, error }))),

        setManualClaimStartedAt: (hashlock: string, timestamp: number) =>
            set((state) => updateFlags(state, hashlock, (flags) => {
                if (flags.manualClaimStartedAt) return flags
                return { ...flags, manualClaimStartedAt: timestamp }
            })),

        // --- Order data ---
        setOrderData: (hashlock: string, data: HTLCFromApi) =>
            set((state) => ({
                orderData: { ...state.orderData, [hashlock]: data },
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
