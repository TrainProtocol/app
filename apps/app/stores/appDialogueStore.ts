import { createWithEqualityFn as create } from 'zustand/traditional'

export type AppDialogueView = 'wallets' | 'login' | 'userStatus' | 'connectWallet' | 'recoverSwap'

interface AppDialogueState {
    view: AppDialogueView | null
    stack: AppDialogueView[]
    open: (view: AppDialogueView) => void
    push: (view: AppDialogueView) => void
    back: () => void
    close: () => void
}

export const useAppDialogueStore = create<AppDialogueState>()((set) => ({
    view: null,
    stack: [],
    open: (view) => set({ view, stack: [view] }),
    push: (view) => set((state) => ({ view, stack: [...state.stack, view] })),
    back: () => set((state) => {
        if (state.stack.length <= 1) return { view: null, stack: [] }
        const next = state.stack.slice(0, -1)
        return { view: next[next.length - 1], stack: next }
    }),
    close: () => set({ view: null, stack: [] }),
}))
