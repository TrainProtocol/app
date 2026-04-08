import { createWithEqualityFn as create } from 'zustand/traditional'
import { createJSONStorage, persist } from 'zustand/middleware'

type SwapPreferencesState = {
    autoRevealSecret: boolean
    hasSeenAutoRevealPrompt: boolean
    setAutoRevealSecret: (val: boolean) => void
    setHasSeenAutoRevealPrompt: (val: boolean) => void
}

export const useSwapPreferencesStore = create<SwapPreferencesState>()(
    persist(
        (set) => ({
            autoRevealSecret: true,
            hasSeenAutoRevealPrompt: false,
            setAutoRevealSecret: (val) => set({ autoRevealSecret: val }),
            setHasSeenAutoRevealPrompt: (val) => set({ hasSeenAutoRevealPrompt: val }),
        }),
        {
            name: 'train:swap-preferences',
            storage: createJSONStorage(() => localStorage),
        }
    )
)
