import { useCallback, useRef, useState } from 'react'
import { useStoreWithEqualityFn as useStore } from 'zustand/traditional'
import { shallow } from 'zustand/shallow'
import {
    deriveSecretFromTimelock,
    secretToHashlock,
    bytesToHex,
} from '@train-protocol/sdk'
import {
    deriveKeyWithPasskey,
    registerPasskey as sdkRegisterPasskey,
    deriveKeyFromWallet,
    checkPrfSupport,
} from '@train-protocol/auth'
import type { PrfSupportResult, PasskeyCredentialStorage, StoredPasskey } from '@train-protocol/auth'
import type { DerivationMethod } from '../types'
import { chainNamespace as brandChainNamespace } from '../internal/branded'
import { useWalletContextOptional } from '../wallet/WalletContext'
import {
    createSecretDerivationStore,
    type SecretDerivationStore,
} from '../internal/secretDerivationStore'

export interface UseSecretDerivationOptions {
    /** Passkey credential storage (optional, uses in-memory if omitted) */
    passkeyStorage?: PasskeyCredentialStorage
    /** Persist derivedKey to encrypted IndexedDB (default: false) */
    persist?: boolean
    /** TrainAuth instance for wallet-based login. Falls back to global default if omitted. */
    auth?: import('@train-protocol/auth').TrainAuth
}

export interface PasskeyLoginOptions {
    /** Force create a new passkey instead of using an existing one */
    forceCreate?: boolean
    /** Display name for the new passkey (only used with forceCreate) */
    label?: string
    /** Only authenticate with existing passkey, never auto-create */
    crossDevice?: boolean
    /** Target a specific stored credential via WebAuthn allowCredentials */
    credentialId?: string
}

export interface UseSecretDerivationResult {
    /** True once all async initialization is complete (passkey support detection, store hydration). Safe to render UI. */
    isReady: boolean
    method: DerivationMethod | null
    isLoggedIn: boolean
    derivationStatus: 'idle' | 'signing'
    derivationMessage: string
    /** Error from the last login/register attempt, cleared on next attempt */
    error: Error | null

    loginWithPasskey: (options?: PasskeyLoginOptions) => Promise<void>
    /**
     * Generic primitive for callers that derived the passkey login outside of SD
     * (e.g. a wallet module that needs the PRF buffer in the same assertion). The
     * deriver returns the HTLC key + credentialId; SD handles status, error,
     * storage, and store updates around it. SD has no knowledge of what the
     * deriver does with the assertion.
     */
    loginWithPasskeyDerived: (
        deriver: () => Promise<{ key: Uint8Array; credentialId: string; label?: string }>,
    ) => Promise<void>
    /**
     * Login with wallet. When used inside TrainProvider with an adapter that
     * implements getLoginConfig(), only chainNamespace is needed.
     * Falls back to explicit config if provided.
     */
    loginWithWallet: (chainNamespace: string, config?: Record<string, unknown>) => Promise<void>
    logout: () => void

    deriveSecret: (nonce?: number) => { secret: string; nonce: number; hashlock: string } | null

    // Passkey management
    registerPasskey: (displayName?: string) => Promise<void>
    passkeyCredentials: StoredPasskey[]
    activePasskeyCredentialId: string | null
    removePasskeyCredential: (id: string) => void
    clearAllPasskeyCredentials: () => void

    prfSupport: PrfSupportResult | null
    checkPasskeySupport: () => Promise<PrfSupportResult>
}

/** @internal Full result including store and derivedKey — used by SecretDerivationProvider only */
export interface UseSecretDerivationInternalResult extends UseSecretDerivationResult {
    /** @internal Raw key material — not exposed to consumers */
    derivedKey: Uint8Array | null
    _store: SecretDerivationStore
}

export function useSecretDerivation(options?: UseSecretDerivationOptions): UseSecretDerivationInternalResult {
    const shouldPersist = options?.persist === true

    // Create store once (stable across renders)
    const storeRef = useRef<SecretDerivationStore | null>(null)
    if (!storeRef.current) {
        storeRef.current = createSecretDerivationStore({
            persist: shouldPersist,
        })
    }
    const store = storeRef.current

    // Single store subscription with shallow equality (consolidates 6 separate subscriptions)
    const { method, derivedKey, derivationStatus, derivationMessage, prfSupport, hydrated, credentialVersion } = useStore(store, (s) => ({
        method: s.method,
        derivedKey: s.derivedKey,
        derivationStatus: s.derivationStatus,
        derivationMessage: s.derivationMessage,
        prfSupport: s.prfSupport,
        hydrated: s.hydrated,
        credentialVersion: s.credentialVersion,
    }), shallow)

    // Wallet context (optional — works outside TrainProvider too)
    const walletCtx = useWalletContextOptional()

    const passkeyStorage = options?.passkeyStorage

    const isLoggedIn = !!method && !!derivedKey
    const [error, setError] = useState<Error | null>(null)

    /**
     * Run a caller-provided derivation inside the SD lifecycle (status, error,
     * credential storage, store update). The deriver is responsible for the
     * passkey assertion itself. This is the primitive that `loginWithPasskey`
     * builds on, and the one wallets call when they need to share an assertion
     * with their own seed-derivation path.
     */
    const loginWithPasskeyDerived = useCallback(async (
        deriver: () => Promise<{ key: Uint8Array; credentialId: string; label?: string }>,
    ) => {
        setError(null)
        store.getState().setDerivationStatus('signing')
        store.getState().setDerivationMessage('Confirm with passkey')
        try {
            const { key, credentialId, label } = await deriver()
            // storeCredentialId is idempotent for existing entries (preserves the
            // existing label). For new entries, a missing label falls back to
            // DEFAULT_PASSKEY_DISPLAY_NAME — so the deriver must surface the
            // user-chosen label when it just registered a credential.
            await passkeyStorage?.storeCredentialId(credentialId, label)
            store.getState().setLogin('passkey', key)
            store.getState().bumpCredentialVersion()
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            setError(error)
            throw error
        } finally {
            store.getState().setDerivationStatus('idle')
            store.getState().setDerivationMessage('')
        }
    }, [store, passkeyStorage])

    const loginWithPasskey = useCallback(async (loginOpts?: PasskeyLoginOptions) => {
        return loginWithPasskeyDerived(async () => {
            if (loginOpts?.forceCreate) {
                const result = await sdkRegisterPasskey(true, loginOpts.label, passkeyStorage)
                if (result.key) {
                    return { key: result.key, credentialId: result.credentialId }
                }
                // Registration produced a credential but no PRF — re-assert to obtain the key.
                return await deriveKeyWithPasskey({ createIfMissing: false }, passkeyStorage)
            }
            return await deriveKeyWithPasskey(
                {
                    createIfMissing: !loginOpts?.crossDevice && !loginOpts?.credentialId,
                    credentialId: loginOpts?.credentialId,
                },
                passkeyStorage,
            )
        })
    }, [loginWithPasskeyDerived, passkeyStorage])

    const authInstance = options?.auth
    const loginWithWallet = useCallback(async (chainNs: string, config?: Record<string, unknown>) => {
        setError(null)
        const ns = brandChainNamespace(chainNs)
        const resolvedConfig = config ?? (await walletCtx?.getLoginConfig(ns))
        if (!resolvedConfig) {
            const error = new Error(
                `No login config available for "${chainNs}". ` +
                `Either pass config explicitly or ensure the wallet adapter implements getLoginConfig() and the wallet is connected.`
            )
            setError(error)
            throw error
        }

        store.getState().setDerivationStatus('signing')
        store.getState().setDerivationMessage('Please sign in wallet')
        try {
            // Use auth instance from context if provided, otherwise fall back to free function
            const key = authInstance
                ? await authInstance.deriveKeyFromWallet(chainNs, resolvedConfig)
                : await deriveKeyFromWallet(chainNs, resolvedConfig)
            store.getState().setLogin('wallet_sign', key)
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            setError(error)
            throw error
        } finally {
            store.getState().setDerivationStatus('idle')
            store.getState().setDerivationMessage('')
        }
    }, [store, walletCtx, authInstance])

    const logout = useCallback(() => {
        store.getState().logout()
    }, [store])

    const deriveSecret = useCallback((nonce?: number) => {
        const currentKey = store.getState().derivedKey
        if (!currentKey) return null
        const timestamp = nonce ?? Date.now()
        const secretBytes = deriveSecretFromTimelock(currentKey, timestamp)
        const secret = bytesToHex(Array.from(secretBytes))
        const hashlock = secretToHashlock(secret)
        return { secret, nonce: timestamp, hashlock }
    }, [store])

    const registerPasskey = useCallback(async (displayName?: string) => {
        setError(null)
        store.getState().setDerivationStatus('signing')
        store.getState().setDerivationMessage('Register passkey')
        try {
            const { credentialId, key } = await sdkRegisterPasskey(true, displayName, passkeyStorage)
            if (key) {
                store.getState().setLogin('passkey', key)
            }
            await passkeyStorage?.storeCredentialId(credentialId)
            store.getState().bumpCredentialVersion()
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            setError(error)
            throw error
        } finally {
            store.getState().setDerivationStatus('idle')
            store.getState().setDerivationMessage('')
        }
    }, [store, passkeyStorage])

    // Read from in-memory cache (sync) — IndexedDBPasskeyStorage returns sync from memory
    const passkeyCredentials = (passkeyStorage?.getAllCredentials() ?? []) as StoredPasskey[]
    const activePasskeyCredentialId = (passkeyStorage?.getActiveCredentialId() ?? null) as string | null
    // Subscribe to credentialVersion so React re-renders when credentials change.
    // The value itself is unused — reading it is enough to create the dependency.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    credentialVersion

    const removePasskeyCredential = useCallback((id: string) => {
        passkeyStorage?.removeCredentialId?.(id)
        store.getState().bumpCredentialVersion()
    }, [store, passkeyStorage])

    const clearAllPasskeyCredentials = useCallback(() => {
        passkeyStorage?.clearAllCredentials?.()
        store.getState().bumpCredentialVersion()
    }, [store, passkeyStorage])

    const checkPasskeySupport = useCallback(async () => {
        const result = await checkPrfSupport()
        store.getState().setPrfSupport(result)
        return result
    }, [store])

    // isReady: PRF support detected AND store hydrated (hydrated is true by default when persist is off)
    const isReady = prfSupport !== null && hydrated

    return {
        isReady,
        method,
        isLoggedIn,
        derivedKey,
        derivationStatus,
        derivationMessage,
        error,
        loginWithPasskey,
        loginWithPasskeyDerived,
        loginWithWallet,
        logout,
        deriveSecret,
        registerPasskey,
        passkeyCredentials,
        activePasskeyCredentialId,
        removePasskeyCredential,
        clearAllPasskeyCredentials,
        prfSupport,
        checkPasskeySupport,
        _store: store,
    }
}
