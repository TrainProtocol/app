import { createWithEqualityFn as create } from 'zustand/traditional'
import type { WalletProvider as AztecSDKWalletProvider } from '@aztec/wallet-sdk/manager'
import { Wallet } from '@aztec/aztec.js/wallet'

export type AztecWallet = Wallet

interface AztecWalletStoreState {
    wallet: AztecWallet | null
    discoveredProviders: AztecSDKWalletProvider[]
    isDiscovering: boolean
    setWallet: (wallet: AztecWallet | null) => void
    setDiscoveredProviders: (providers: AztecSDKWalletProvider[]) => void
    addDiscoveredProvider: (provider: AztecSDKWalletProvider) => void
    setIsDiscovering: (discovering: boolean) => void
}

export const useAztecWalletStore = create<AztecWalletStoreState>()((set, get) => ({
    wallet: null,
    discoveredProviders: [],
    isDiscovering: false,
    setWallet: (wallet) => set({ wallet }),
    setDiscoveredProviders: (providers) => set({ discoveredProviders: providers }),
    addDiscoveredProvider: (provider) => {
        const existing = get().discoveredProviders
        if (existing.some(p => p.id === provider.id)) return
        set({ discoveredProviders: [...existing, provider] })
    },
    setIsDiscovering: (discovering) => set({ isDiscovering: discovering }),
}))
