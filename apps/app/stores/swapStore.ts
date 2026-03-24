import { create } from 'zustand'

interface SwapStoreState {
    /** The hashlock of the swap currently being viewed/monitored */
    activeHashlock: string | null
    setActiveHashlock: (hashlock: string | null) => void
    swapModalOpen: boolean
    setSwapModalOpen: (open: boolean) => void
}

export const useSwapStore = create<SwapStoreState>()((set) => ({
    activeHashlock: null,
    setActiveHashlock: (hashlock) => set({ activeHashlock: hashlock }),
    swapModalOpen: false,
    setSwapModalOpen: (open) => set({ swapModalOpen: open }),
}))
