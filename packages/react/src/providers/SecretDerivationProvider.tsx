import { createContext, useContext, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { useSecretDerivation as useSecretDerivationHook } from '../hooks/useSecretDerivation'
import type { UseSecretDerivationOptions, UseSecretDerivationResult, PasskeyLoginOptions } from '../hooks/useSecretDerivation'
import type { PrfSupportResult } from '@train-protocol/auth'
import { LocalStoragePasskeyStorage } from '../internal/LocalStoragePasskeyStorage'
import {
    createSecretDerivationStore,
    type SecretDerivationStore,
    type LoginWalletInfo,
} from '../internal/secretDerivationStore'

export type { LoginWalletInfo } from '../internal/secretDerivationStore'

export interface SecretDerivationContextValue extends UseSecretDerivationResult {
    /** The wallet used for wallet_sign login (for UI display) */
    loginWallet: LoginWalletInfo | null
    /** Alias for prfSupport */
    prfSupportDetails: PrfSupportResult | null
}

const SecretDerivationContext = createContext<SecretDerivationContextValue | null>(null)

export interface SecretDerivationProviderProps extends UseSecretDerivationOptions {
    children: ReactNode
    /**
     * Auto-check passkey support on mount (default: true).
     * When true, calls checkPasskeySupport() on first render only.
     */
    autoCheckPasskeySupport?: boolean
}

const defaultPasskeyStorage = new LocalStoragePasskeyStorage()

export function SecretDerivationProvider({
    children,
    autoCheckPasskeySupport = true,
    persist = false,
    persistKey = 'train:auth',
    passkeyStorage = defaultPasskeyStorage,
}: SecretDerivationProviderProps) {
    const hook = useSecretDerivationHook({ persist, persistKey, passkeyStorage })

    // Create a dedicated store for loginWallet (persisted alongside the hook store)
    const walletStoreRef = useRef<SecretDerivationStore | null>(null)
    if (!walletStoreRef.current) {
        walletStoreRef.current = createSecretDerivationStore({
            persist,
            persistKey: `${persistKey}:wallet`,
        })
    }
    const walletStore = walletStoreRef.current
    const loginWallet = useStore(walletStore, (s) => s.loginWallet)

    // Auto-check passkey support (fire-once on mount when enabled)
    const checkPasskeyRef = useRef(hook.checkPasskeySupport)
    checkPasskeyRef.current = hook.checkPasskeySupport
    useEffect(() => {
        if (autoCheckPasskeySupport) {
            checkPasskeyRef.current()
        }
    }, [autoCheckPasskeySupport])

    // Wrap loginWithWallet to track wallet info
    const originalLoginWithWallet = hook.loginWithWallet
    const loginWithWallet = useCallback(async (
        chainNamespace: string,
        config?: Record<string, unknown>,
    ) => {
        await originalLoginWithWallet(chainNamespace, config)
        const walletInfo: LoginWalletInfo = {
            address: (config?.address as string) ?? '',
            providerName: chainNamespace,
            displayName: (config?.displayName as string) ?? undefined,
            chainId: (config?.chainId as string | number) ?? undefined,
        }
        walletStore.getState().setLoginWallet(walletInfo)
    }, [originalLoginWithWallet, walletStore])

    // Wrap logout to clear wallet info
    const originalLogout = hook.logout
    const logout = useCallback(() => {
        originalLogout()
        walletStore.getState().setLoginWallet(null)
    }, [originalLogout, walletStore])

    const value = useMemo<SecretDerivationContextValue>(() => ({
        ...hook,
        loginWithWallet,
        logout,
        loginWallet,
        prfSupportDetails: hook.prfSupport,
    }), [hook.derivedKey, hook.method, hook.derivationStatus, hook.prfSupport, hook.isLoggedIn, hook.derivationMessage, hook.passkeyCredentials, loginWithWallet, logout, loginWallet])

    return (
        <SecretDerivationContext.Provider value={value}>
            {children}
        </SecretDerivationContext.Provider>
    )
}

/**
 * Access shared secret derivation state. Throws when used outside TrainProvider.
 * For standalone (non-shared) usage, use useSecretDerivation() hook directly.
 */
export function useSharedSecretDerivation(): SecretDerivationContextValue {
    const ctx = useContext(SecretDerivationContext)
    if (!ctx) {
        throw new Error('useSharedSecretDerivation must be used within <TrainProvider>')
    }
    return ctx
}

/**
 * Access shared secret derivation state, returning null when outside TrainProvider.
 * Useful for components that may render outside the provider tree (e.g. error pages).
 */
export function useOptionalSecretDerivation(): SecretDerivationContextValue | null {
    return useContext(SecretDerivationContext)
}
