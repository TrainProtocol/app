import { create } from 'zustand'

interface SwapStoreState {
    swapModalOpen: boolean
    setSwapModalOpen: (open: boolean) => void
}

export const useSwapStore = create<SwapStoreState>()((set) => ({
    swapModalOpen: false,
    setSwapModalOpen: (open) => set({ swapModalOpen: open }),
}))
