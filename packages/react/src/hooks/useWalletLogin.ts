import { useCallback } from 'react'
import { deriveKeyFromWallet } from '@train-protocol/auth'

export interface UseWalletLoginResult {
    login: (providerName: string, config: Record<string, unknown>) => Promise<CryptoKey>
}

export function useWalletLogin(): UseWalletLoginResult {
    const login = useCallback(async (providerName: string, config: Record<string, unknown>) => {
        return deriveKeyFromWallet(providerName, config)
    }, [])

    return { login }
}
