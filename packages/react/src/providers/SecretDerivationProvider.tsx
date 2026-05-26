import { createContext, useContext, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { useStoreWithEqualityFn as useStore } from 'zustand/traditional'
import { createStore } from 'zustand/vanilla'
import { useTrainContext } from './TrainContext'
import { useSecretDerivation as useSecretDerivationHook } from '../hooks/useSecretDerivation'
import type { UseSecretDerivationOptions, UseSecretDerivationResult, UseSecretDerivationInternalResult, PasskeyLoginOptions } from '../hooks/useSecretDerivation'
import type { PrfSupportResult } from '@train-protocol/auth'
import { SecureStorage } from '../internal/SecureStorage'
import { IndexedDBPasskeyStorage } from '../internal/IndexedDBPasskeyStorage'
import type { LoginWalletInfo, SecretDerivationStoreState, SecretDerivationStore } from '../internal/secretDerivationStore'

/**
 * @internal Context exposing the raw SD store for internal hooks (useRevealSecret, useCreateSwap).
 * NOT exported from the package — consumers should use useSharedSecretDerivation() instead.
 */
const SDStoreContext = createContext<SecretDerivationStore | null>(null)

/** @internal Read derivedKey from the SD store. Throws outside TrainProvider. */
export function useSDStoreContext(): SecretDerivationStore | null {
    return useContext(SDStoreContext)
}

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

export function SecretDerivationProvider({
    children,
    autoCheckPasskeySupport = true,
    persist = false,
    passkeyStorage: externalPasskeyStorage,
}: SecretDerivationProviderProps) {
    // Read auth instance from TrainProvider context (fixes issue #2c)
    const { auth } = useTrainContext()

    // Create SecureStorage and IndexedDBPasskeyStorage (stable across renders)
    const secureStorageRef = useRef<SecureStorage | null>(null)
    if (!secureStorageRef.current) {
        secureStorageRef.current = new SecureStorage()
    }

    const passkeyStorageRef = useRef<IndexedDBPasskeyStorage | null>(null)
    if (!passkeyStorageRef.current && !externalPasskeyStorage) {
        passkeyStorageRef.current = new IndexedDBPasskeyStorage(secureStorageRef.current)
    }

    const passkeyStorage = externalPasskeyStorage ?? passkeyStorageRef.current ?? undefined

    // Pass auth from context to the hook (fixes issue #2c — custom auth instances now work)
    const hook = useSecretDerivationHook({ persist, passkeyStorage, auth })

    // Empty store fallback so useStore is never called conditionally (rules of hooks)
    const EMPTY_SD_STORE = useRef(createStore<SecretDerivationStoreState>()(() => ({
        method: null, derivedKey: null, loginWallet: null, hydrated: false,
        derivationStatus: 'idle' as const, derivationMessage: '', prfSupport: null, credentialVersion: 0,
        setLogin: () => {}, setLoginWallet: () => {}, setDerivationStatus: () => {},
        setDerivationMessage: () => {}, setPrfSupport: () => {}, bumpCredentialVersion: () => {},
        logout: () => {}, hydrate: async () => {},
    }))).current

    // Read loginWallet and hydrated from the hook's store unconditionally (rules of hooks)
    const loginWallet = useStore(hook._store ?? EMPTY_SD_STORE, (s) => s.loginWallet)
    const hydrated = useStore(hook._store ?? EMPTY_SD_STORE, (s) => s.hydrated)

    // Initialize SecureStorage + hydrate store on mount
    useEffect(() => {
        if (!persist) return

        const ss = secureStorageRef.current
        if (!ss) return

        let cancelled = false

        const init = async () => {
            await ss.init()

           
            if (cancelled) return

            // Initialize IndexedDB passkey storage
            if (passkeyStorageRef.current) {
                await passkeyStorageRef.current.init()
            }

            // Hydrate the store from IndexedDB
            await hook._store?.getState().hydrate(ss)
        }

        init().catch(() => {
            // Storage init failed (e.g. IndexedDB blocked) — mark hydrated so isReady doesn't hang forever
            hook._store?.setState({ hydrated: true })
        })

        return () => { cancelled = true }
    }, [persist]) // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-check passkey support (fire-once on mount when enabled)
    const checkPasskeyRef = useRef(hook.checkPasskeySupport)
    checkPasskeyRef.current = hook.checkPasskeySupport
    useEffect(() => {
        if (autoCheckPasskeySupport) {
            checkPasskeyRef.current()
        }
    }, [autoCheckPasskeySupport])

    // Wrap loginWithWallet to track wallet info in the same store
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
        hook._store?.getState().setLoginWallet(walletInfo)
    }, [originalLoginWithWallet, hook._store])

    // Wrap logout to clear wallet info and zeroize key material (fixes issue #22)
    const originalLogout = hook.logout
    const logout = useCallback(() => {
        originalLogout()
        hook._store?.getState().setLoginWallet(null)
    }, [originalLogout, hook._store])

    // When autoCheckPasskeySupport is disabled, skip the PRF gate but still require hydration
    const isReady = autoCheckPasskeySupport
        ? hook.isReady
        : hydrated

    // Exclude derivedKey and _store from the public context value
    const { derivedKey: _dk, _store: _s, ...publicHook } = hook

    const value = useMemo<SecretDerivationContextValue>(() => ({
        ...publicHook,
        isReady,
        loginWithWallet,
        logout,
        loginWallet,
        prfSupportDetails: hook.prfSupport,
    }), [hook.method, hook.derivationStatus, hook.derivationMessage, hook.error, hook.prfSupport, hook.isLoggedIn, hook.passkeyCredentials, hook.activePasskeyCredentialId, isReady, loginWithWallet, logout, loginWallet])

    return (
        <SDStoreContext.Provider value={hook._store}>
            <SecretDerivationContext.Provider value={value}>
                {children}
            </SecretDerivationContext.Provider>
        </SDStoreContext.Provider>
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
