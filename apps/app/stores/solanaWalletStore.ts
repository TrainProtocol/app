import { create } from 'zustand'

interface SolanaWalletState {
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined
  setSignMessage: (fn: SolanaWalletState['signMessage']) => void
}

export const useSolanaWalletStore = create<SolanaWalletState>()((set) => ({
  signMessage: undefined,
  setSignMessage: (fn) => set({ signMessage: fn }),
}))
