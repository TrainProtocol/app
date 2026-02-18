import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface SwapData {
    requestedAmount: string
    address: string
    source: string
    destination: string
    source_asset: string
    destination_asset: string
    solver?: string
    srcContract?: string
    destContract?: string
    receiveAmount?: string
    hashlock?: string
    txId?: string
    refundTxId?: string
}

interface SwapStoreState {
    tempSwap: SwapData | null
    swaps: Record<string, SwapData>
    setTempSwap: (data: SwapData) => void
    clearTempSwap: () => void
    commitSwap: (hashlock: string, txId: string) => void
    updateSwap: (hashlock: string, updates: Partial<SwapData>) => void
    recoverSwap: (hashlock: string, data: SwapData) => void
}

export const useSwapStore = create<SwapStoreState>()(
    persist(
        (set, get) => ({
            tempSwap: null,
            swaps: {},

            setTempSwap: (data) => set({ tempSwap: data }),

            clearTempSwap: () => set({ tempSwap: null }),

            commitSwap: (hashlock, txId) => {
                const { tempSwap, swaps } = get()
                if (!tempSwap) return

                set({
                    tempSwap: null,
                    swaps: {
                        ...swaps,
                        [hashlock]: {
                            ...tempSwap,
                            hashlock,
                            txId,
                        },
                    },
                })
            },

            updateSwap: (hashlock, updates) => {
                const { swaps } = get()
                const existing = swaps[hashlock]
                if (!existing) return

                set({
                    swaps: {
                        ...swaps,
                        [hashlock]: { ...existing, ...updates },
                    },
                })
            },

            recoverSwap: (hashlock, data) => {
                const { swaps } = get()
                if (swaps[hashlock]) return

                set({
                    swaps: {
                        ...swaps,
                        [hashlock]: { ...data, hashlock },
                    },
                })
            },
        }),
        {
            name: 'train:swaps',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                swaps: state.swaps,
            }),
        }
    )
)
