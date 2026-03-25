import { useCallback, useRef } from 'react'
import { useStore } from 'zustand'
import {
    deriveSecretFromTimelock,
    secretToHashlock,
} from '@train-protocol/sdk'
import {
    deriveKeyWithPasskey,
    registerPasskey as sdkRegisterPasskey,
    deriveKeyFromWallet,
    checkPrfSupport,
} from '@train-protocol/auth'
import type { PrfSupportResult, PasskeyCredentialStorage } from '@train-protocol/auth'
import type { DerivationMethod } from '../types'
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
}

export interface PasskeyLoginOptions {
    /** Force create a new passkey instead of using an existing one */
    forceCreate?: boolean
    /** Display name for the new passkey (only used with forceCreate) */
    label?: string
    /** Only authenticate with existing passkey, never auto-create */
    crossDevice?: boolean
}

export interface UseSecretDerivationResult {
    method: DerivationMethod | null
    isLoggedIn: boolean
    derivedKey: Uint8Array | null
    derivationStatus: 'idle' | 'signing'
    derivationMessage: string

    loginWithPasskey: (options?: PasskeyLoginOptions) => Promise<void>
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
    passkeyCredentials: string[]
    activePasskeyCredentialId: string | null
    removePasskeyCredential: (id: string) => void

    prfSupport: PrfSupportResult | null
    checkPasskeySupport: () => Promise<PrfSupportResult>

    /** @internal Exposed for SecretDerivationProvider to call hydrate() */
    _store: SecretDerivationStore
}

function uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function useSecretDerivation(options?: UseSecretDerivationOptions): UseSecretDerivationResult {
    const shouldPersist = options?.persist === true

    // Create store once (stable across renders)
    const storeRef = useRef<SecretDerivationStore | null>(null)
    if (!storeRef.current) {
        storeRef.current = createSecretDerivationStore({
            persist: shouldPersist,
        })
    }
    const store = storeRef.current

    // Subscribe to store state
    const method = useStore(store, (s) => s.method)
    const derivedKey = useStore(store, (s) => s.derivedKey)
    const derivationStatus = useStore(store, (s) => s.derivationStatus)
    const derivationMessage = useStore(store, (s) => s.derivationMessage)
    const prfSupport = useStore(store, (s) => s.prfSupport)
    const credentialVersion = useStore(store, (s) => s.credentialVersion)

    // Wallet context (optional — works outside TrainProvider too)
    const walletCtx = useWalletContextOptional()

    const passkeyStorage = options?.passkeyStorage

    const isLoggedIn = !!method && !!derivedKey

    const loginWithPasskey = useCallback(async (options?: PasskeyLoginOptions) => {
        store.getState().setDerivationStatus('signing')
        store.getState().setDerivationMessage('Confirm with passkey')
        try {
            let key: Uint8Array
            let credentialId: string

            if (options?.forceCreate) {
                const result = await sdkRegisterPasskey(true, options.label, passkeyStorage)
                if (result.key) {
                    key = result.key
                    credentialId = result.credentialId
                } else {
                    ;({ key, credentialId } = await deriveKeyWithPasskey(
                        { createIfMissing: false },
                        passkeyStorage,
                    ))
                }
            } else {
                ;({ key, credentialId } = await deriveKeyWithPasskey(
                    { createIfMissing: !options?.crossDevice },
                    passkeyStorage,
                ))
            }

            await passkeyStorage?.storeCredentialId(credentialId)
            store.getState().setLogin('passkey', key)
            store.getState().bumpCredentialVersion()
        } finally {
            store.getState().setDerivationStatus('idle')
            store.getState().setDerivationMessage('')
        }
    }, [store, passkeyStorage])

    const loginWithWallet = useCallback(async (chainNamespace: string, config?: Record<string, unknown>) => {
        const resolvedConfig = config ?? (await walletCtx?.getLoginConfig(chainNamespace))
        if (!resolvedConfig) {
            throw new Error(
                `No login config available for "${chainNamespace}". ` +
                `Either pass config explicitly or ensure the wallet adapter implements getLoginConfig() and the wallet is connected.`
            )
        }

        store.getState().setDerivationStatus('signing')
        store.getState().setDerivationMessage('Please sign in wallet')
        try {
            const key = await deriveKeyFromWallet(chainNamespace, resolvedConfig)
            store.getState().setLogin('wallet_sign', key)
        } finally {
            store.getState().setDerivationStatus('idle')
            store.getState().setDerivationMessage('')
        }
    }, [store, walletCtx])

    const logout = useCallback(() => {
        store.getState().logout()
    }, [store])

    const deriveSecret = useCallback((nonce?: number) => {
        const currentKey = store.getState().derivedKey
        if (!currentKey) return null
        const timestamp = nonce ?? Date.now()
        const secretBytes = deriveSecretFromTimelock(currentKey, timestamp)
        const secret = '0x' + uint8ArrayToHex(secretBytes)
        const hashlock = secretToHashlock(secret)
        return { secret, nonce: timestamp, hashlock }
    }, [store])

    const registerPasskey = useCallback(async (displayName?: string) => {
        store.getState().setDerivationStatus('signing')
        store.getState().setDerivationMessage('Register passkey')
        try {
            const { credentialId, key } = await sdkRegisterPasskey(true, displayName, passkeyStorage)
            if (key) {
                store.getState().setLogin('passkey', key)
            }
            await passkeyStorage?.storeCredentialId(credentialId)
            store.getState().bumpCredentialVersion()
        } finally {
            store.getState().setDerivationStatus('idle')
            store.getState().setDerivationMessage('')
        }
    }, [store, passkeyStorage])

    // Read from in-memory cache (sync) — IndexedDBPasskeyStorage returns sync from memory
    const passkeyCredentials = (passkeyStorage?.getAllCredentialIds() ?? []) as string[]
    const activePasskeyCredentialId = (passkeyStorage?.getActiveCredentialId() ?? null) as string | null
    // Subscribe to credentialVersion so React re-renders when credentials change.
    // The value itself is unused — reading it is enough to create the dependency.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    credentialVersion

    const removePasskeyCredential = useCallback((id: string) => {
        passkeyStorage?.removeCredentialId?.(id)
        store.getState().bumpCredentialVersion()
    }, [store, passkeyStorage])

    const checkPasskeySupport = useCallback(async () => {
        const result = await checkPrfSupport()
        store.getState().setPrfSupport(result)
        return result
    }, [store])

    return {
        method,
        isLoggedIn,
        derivedKey,
        derivationStatus,
        derivationMessage,
        loginWithPasskey,
        loginWithWallet,
        logout,
        deriveSecret,
        registerPasskey,
        passkeyCredentials,
        activePasskeyCredentialId,
        removePasskeyCredential,
        prfSupport,
        checkPasskeySupport,
        _store: store,
    }
}
