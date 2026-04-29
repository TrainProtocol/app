import { createWithEqualityFn as create } from 'zustand/traditional'

interface AuthDialogState {
    open: boolean
    openAuthDialog: () => void
    close: () => void
}

export const useAuthDialog = create<AuthDialogState>()((set) => ({
    open: false,
    openAuthDialog: () => set({ open: true }),
    close: () => set({ open: false }),
}))
