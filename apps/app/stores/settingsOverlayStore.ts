import { createWithEqualityFn as create } from 'zustand/traditional'

export type SettingsOverlayView = 'wallets' | 'login' | 'userStatus' | 'connectWallet'

interface SettingsOverlayState {
    view: SettingsOverlayView | null
    stack: SettingsOverlayView[]
    open: (view: SettingsOverlayView) => void
    push: (view: SettingsOverlayView) => void
    back: () => void
    close: () => void
}

export const useSettingsOverlayStore = create<SettingsOverlayState>()((set) => ({
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
