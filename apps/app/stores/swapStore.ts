import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { HTLCStatus } from '@/Models/HTLCStatus'
import { LoginIdentity } from './secretDerivationStore'

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
    destTxId?: string
    secretRevealed?: boolean
    status?: HTLCStatus
    createdAt?: number
    timelock?: number
    sourceSolverAddress?: string
    destinationSolverAddress?: string
    loginIdentity?: LoginIdentity
}

interface SwapStoreState {
    tempSwap: SwapData | null
    swaps: Record<string, SwapData>
    activeHashlock: string | null
    swapModalOpen: boolean
    setSwapModalOpen: (open: boolean) => void
    setActiveHashlock: (hashlock: string | null) => void
    setTempSwap: (data: SwapData) => void
    clearTempSwap: () => void
    commitSwap: (hashlock: string, txId: string) => void
    updateSwap: (hashlock: string, updates: Partial<SwapData>) => void
    removeSwap: (hashlock: string) => void
    recoverSwap: (hashlock: string, data: SwapData) => void
    findSwapByTx: (sourceNetwork: string, txHash: string) => [string, SwapData] | null
}

export const useSwapStore = create<SwapStoreState>()(
    persist(
        (set, get) => ({
            tempSwap: null,
            swaps: {},
            activeHashlock: null,
            swapModalOpen: false,

            setSwapModalOpen: (open) => set({ swapModalOpen: open }),

            setActiveHashlock: (hashlock) => set({ activeHashlock: hashlock }),

            setTempSwap: (data) => set({ tempSwap: data }),

            clearTempSwap: () => set({ tempSwap: null }),

            commitSwap: (hashlock, txId) => {
                const { tempSwap, swaps } = get()
                if (!tempSwap) return

                set({
                    tempSwap: null,
                    activeHashlock: hashlock,
                    swaps: {
                        ...swaps,
                        [hashlock]: {
                            ...tempSwap,
                            hashlock,
                            txId,
                            createdAt: Date.now(),
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

            removeSwap: (hashlock) => {
                const { swaps, activeHashlock } = get()
                const { [hashlock]: _, ...rest } = swaps
                set({
                    swaps: rest,
                    activeHashlock: activeHashlock === hashlock ? null : activeHashlock,
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

            findSwapByTx: (sourceNetwork, txHash) => {
                const { swaps } = get()
                const entry = Object.entries(swaps).find(([, swap]) =>
                    swap.source?.toUpperCase() === sourceNetwork.toUpperCase() &&
                    swap.txId?.toUpperCase() === txHash.toUpperCase()
                )
                return entry ?? null
            },
        }),
        {
            name: 'train:swaps',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                swaps: state.swaps,
                activeHashlock: state.activeHashlock,
            }),
        }
    )
)
