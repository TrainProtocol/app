import { createStore as createZustandStore } from 'zustand/vanilla'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import type { HTLCStatus } from '@train-protocol/sdk'
import type { SwapData, SwapStorage } from '../types'

export interface SwapStoreState {
    swaps: Record<string, SwapData>
    activeHashlock: string | null
    currentSwap: SwapData | null

    setActiveHashlock: (hashlock: string | null) => void
    setCurrentSwap: (data: SwapData) => void
    clearCurrentSwap: () => void
    commitSwap: (hashlock: string, txId: string) => void
    updateSwap: (hashlock: string, updates: Partial<SwapData>) => void
    recoverSwap: (hashlock: string, data: SwapData) => void
    clearSwap: (hashlock: string) => void
}

const STORAGE_KEY = 'train:swaps'

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

    const initialState = {
        swaps: {} as Record<string, SwapData>,
        activeHashlock: null as string | null,
        currentSwap: null as SwapData | null,
    }

    if (!shouldPersist) {
        return createZustandStore<SwapStoreState>()((set) => ({
            ...initialState,
            setActiveHashlock: (hashlock) => set({ activeHashlock: hashlock }),
            setCurrentSwap: (data) => set({ currentSwap: data }),
            clearCurrentSwap: () => set({ currentSwap: null }),
            commitSwap: (hashlock, txId) =>
                set((state) => {
                    const data = state.currentSwap
                    if (!data) return state
                    return {
                        currentSwap: null,
                        swaps: { ...state.swaps, [hashlock]: { ...data, hashlock, txId, createdAt: Date.now() } },
                        activeHashlock: hashlock,
                    }
                }),
            updateSwap: (hashlock, updates) =>
                set((state) => ({
                    swaps: {
                        ...state.swaps,
                        [hashlock]: { ...state.swaps[hashlock], ...updates },
                    },
                })),
            recoverSwap: (hashlock, data) =>
                set((state) => {
                    if (state.swaps[hashlock]) return state
                    return {
                        swaps: { ...state.swaps, [hashlock]: data },
                        activeHashlock: hashlock,
                    }
                }),
            clearSwap: (hashlock) =>
                set((state) => {
                    const { [hashlock]: _, ...rest } = state.swaps
                    return {
                        swaps: rest,
                        activeHashlock: state.activeHashlock === hashlock ? null : state.activeHashlock,
                    }
                }),
        }))
    }

    const persistStorage = createPersistStorage(options?.storage)

    return createZustandStore<SwapStoreState>()(
        persist(
            (set) => ({
                ...initialState,
                setActiveHashlock: (hashlock) => set({ activeHashlock: hashlock }),
                setCurrentSwap: (data) => set({ currentSwap: data }),
                clearCurrentSwap: () => set({ currentSwap: null }),
                commitSwap: (hashlock, txId) =>
                    set((state) => {
                        const data = state.currentSwap
                        if (!data) return state
                        return {
                            currentSwap: null,
                            swaps: { ...state.swaps, [hashlock]: { ...data, hashlock, txId, createdAt: Date.now() } },
                            activeHashlock: hashlock,
                        }
                    }),
                updateSwap: (hashlock, updates) =>
                    set((state) => ({
                        swaps: {
                            ...state.swaps,
                            [hashlock]: { ...state.swaps[hashlock], ...updates },
                        },
                    })),
                recoverSwap: (hashlock, data) =>
                    set((state) => {
                        if (state.swaps[hashlock]) return state
                        return {
                            swaps: { ...state.swaps, [hashlock]: data },
                            activeHashlock: hashlock,
                        }
                    }),
                clearSwap: (hashlock) =>
                    set((state) => {
                        const { [hashlock]: _, ...rest } = state.swaps
                        return {
                            swaps: rest,
                            activeHashlock: state.activeHashlock === hashlock ? null : state.activeHashlock,
                        }
                    }),
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
