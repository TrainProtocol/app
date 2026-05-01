import { createWithEqualityFn as create } from 'zustand/traditional'
import type { SwapFormValues } from '@/components/DTOs/SwapFormValues'

interface SwapStoreState {
    /** The hashlock of the swap currently being viewed/monitored */
    activeHashlock: string | null
    setActiveHashlock: (hashlock: string | null) => void
    swapModalOpen: boolean
    setSwapModalOpen: (open: boolean) => void
    pendingFormValues: SwapFormValues | undefined
    setPendingFormValues: (values: SwapFormValues | undefined) => void
}

export const useSwapStore = create<SwapStoreState>()((set) => ({
    activeHashlock: null,
    setActiveHashlock: (hashlock) => set({ activeHashlock: hashlock }),
    swapModalOpen: false,
    setSwapModalOpen: (open) => set({ swapModalOpen: open }),
    pendingFormValues: undefined,
    setPendingFormValues: (values) => set({ pendingFormValues: values }),
}))
