import { createContext, useContext, useEffect, useCallback, useState, type ReactNode } from 'react'
import { useSecretDerivation as useSecretDerivationHook } from '../hooks/useSecretDerivation'
import type { UseSecretDerivationOptions, UseSecretDerivationResult, PasskeyLoginOptions } from '../hooks/useSecretDerivation'
import type { PrfSupportResult } from '@train-protocol/auth'
import { LocalStoragePasskeyStorage } from '../internal/LocalStoragePasskeyStorage'

/** Minimal login wallet info for UI display */
export interface LoginWalletInfo {
    address: string
    providerName: string
    displayName?: string
    chainId?: string | number
}

export interface SecretDerivationContextValue extends UseSecretDerivationResult {
    /** The wallet used for wallet_sign login (for UI display) */
    loginWallet: LoginWalletInfo | null
    /** Alias for prfSupport */
    prfSupportDetails: PrfSupportResult | null
}

const SecretDerivationContext = createContext<SecretDerivationContextValue | null>(null)

export interface SecretDerivationProviderProps extends UseSecretDerivationOptions {
    children: ReactNode
    /** Auto-check passkey support on mount (default: true) */
    autoCheckPasskeySupport?: boolean
}

const defaultPasskeyStorage = new LocalStoragePasskeyStorage()

export function SecretDerivationProvider({
    children,
    autoCheckPasskeySupport = true,
    persist = true,
    persistKey = 'train:auth',
    passkeyStorage = defaultPasskeyStorage,
}: SecretDerivationProviderProps) {
    const hook = useSecretDerivationHook({ persist, persistKey, passkeyStorage })
    const [loginWallet, setLoginWallet] = useState<LoginWalletInfo | null>(null)

    // Restore loginWallet after hydration to avoid server/client mismatch
    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            const stored = localStorage.getItem(`${persistKey}:loginWallet`)
            if (stored) setLoginWallet(JSON.parse(stored))
        } catch { /* ignore */ }
    }, [persistKey])

    // Auto-check passkey support
    useEffect(() => {
        if (autoCheckPasskeySupport) {
            hook.checkPasskeySupport()
        }
    }, [])

    // Persist loginWallet
    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            if (loginWallet) {
                localStorage.setItem(`${persistKey}:loginWallet`, JSON.stringify(loginWallet))
            } else {
                localStorage.removeItem(`${persistKey}:loginWallet`)
            }
        } catch { /* ignore */ }
    }, [loginWallet, persistKey])

    // Wrap loginWithWallet to track wallet info
    const originalLoginWithWallet = hook.loginWithWallet
    const loginWithWallet = useCallback(async (
        chainNamespace: string,
        config?: Record<string, unknown>,
    ) => {
        await originalLoginWithWallet(chainNamespace, config)
        // Extract display info from config if available
        const walletInfo: LoginWalletInfo = {
            address: (config?.address as string) ?? '',
            providerName: chainNamespace,
            displayName: (config?.displayName as string) ?? undefined,
            chainId: (config?.chainId as string | number) ?? undefined,
        }
        setLoginWallet(walletInfo)
    }, [originalLoginWithWallet])

    // Wrap logout to clear wallet info
    const originalLogout = hook.logout
    const logout = useCallback(() => {
        originalLogout()
        setLoginWallet(null)
    }, [originalLogout])

    const value: SecretDerivationContextValue = {
        ...hook,
        loginWithWallet,
        logout,
        loginWallet,
        prfSupportDetails: hook.prfSupport,
    }

    return (
        <SecretDerivationContext.Provider value={value}>
            {children}
        </SecretDerivationContext.Provider>
    )
}

/**
 * Access shared secret derivation state. Requires SecretDerivationProvider.
 * For standalone (non-shared) usage, use useSecretDerivation() hook directly.
 */
export function useSharedSecretDerivation(): SecretDerivationContextValue {
    const ctx = useContext(SecretDerivationContext)
    if (!ctx) {
        throw new Error('useSharedSecretDerivation must be used within <SecretDerivationProvider>')
    }
    return ctx
}
