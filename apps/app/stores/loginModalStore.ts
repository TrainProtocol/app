import { createWithEqualityFn as create } from 'zustand/traditional'

interface LoginModalState {
    isOpen: boolean
    open: () => void
    close: () => void
}

export const useLoginModalStore = create<LoginModalState>()((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
}))
