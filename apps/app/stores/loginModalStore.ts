import { createWithEqualityFn as create } from 'zustand/traditional'

type LoginTarget = 'modal' | 'sidebar'

interface LoginModalState {
    isOpen: boolean
    target: LoginTarget | null
    open: (target?: LoginTarget | unknown) => void
    close: () => void
}

export const useLoginModalStore = create<LoginModalState>()((set) => ({
    isOpen: false,
    target: null,
    open: (target) => set({ isOpen: true, target: (typeof target === 'string' ? target : 'modal') as LoginTarget }),
    close: () => set({ isOpen: false, target: null }),
}))
