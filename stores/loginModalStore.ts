import { create } from 'zustand'

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
