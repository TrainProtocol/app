import { useEffect } from 'react'
import { useWalletContext } from './WalletContext'
import type { TrainWalletAdapter } from './types'

/**
 * Register a wallet adapter with the TrainProvider.
 * Call this once per chain namespace (e.g., in a WagmiBridge component).
 * The adapter is automatically unregistered on unmount.
 */
export function useRegisterWallet(adapter: TrainWalletAdapter | null | undefined): void {
    const { registerAdapter } = useWalletContext()

    useEffect(() => {
        if (!adapter) return
        return registerAdapter(adapter)
    }, [adapter, registerAdapter])
}
