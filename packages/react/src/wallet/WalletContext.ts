import { createContext, useContext } from 'react'
import type { TrainWalletAdapter, TrainSigner } from './types'

export interface WalletContextValue {
    adapters: Map<string, TrainWalletAdapter>
    registerAdapter: (adapter: TrainWalletAdapter) => () => void
    getSigner: (chainNamespace: string) => TrainSigner | null
    getClientConfig: (chainNamespace: string) => Record<string, unknown>
}

export const WalletContext = createContext<WalletContextValue | null>(null)

export function useWalletContext(): WalletContextValue {
    const ctx = useContext(WalletContext)
    if (!ctx) {
        throw new Error('useWalletContext must be used within a <TrainProvider>')
    }
    return ctx
}
