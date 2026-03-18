import { useState, useCallback, useEffect, useRef } from 'react'
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
import { LocalStoragePasskeyStorage } from '../internal/LocalStoragePasskeyStorage'
import { useWalletContextOptional } from '../wallet/WalletContext'

export interface UseSecretDerivationOptions {
    /** Passkey credential storage (optional, uses in-memory if omitted) */
    passkeyStorage?: PasskeyCredentialStorage
    /** Persist derivedKey and method to localStorage (default: false) */
    persist?: boolean
    /** localStorage key prefix (default: 'train:auth') */
    persistKey?: string
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
    removePasskeyCredential: (id: string) => void

    prfSupport: PrfSupportResult | null
    checkPasskeySupport: () => Promise<PrfSupportResult>
}

function hexToUint8Array(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }
    return bytes
}

function uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function readPersistedKey(persistKey: string): Uint8Array | null {
    if (typeof window === 'undefined') return null
    try {
        const stored = localStorage.getItem(`${persistKey}:derivedKey`)
        return stored ? hexToUint8Array(stored) : null
    } catch { return null }
}

function readPersistedMethod(persistKey: string): DerivationMethod | null {
    if (typeof window === 'undefined') return null
    try {
        return localStorage.getItem(`${persistKey}:method`) as DerivationMethod | null
    } catch { return null }
}

export function useSecretDerivation(options?: UseSecretDerivationOptions): UseSecretDerivationResult {
    const shouldPersist = options?.persist === true
    const persistKey = options?.persistKey ?? 'train:auth'

    const [method, setMethod] = useState<DerivationMethod | null>(
        () => shouldPersist ? readPersistedMethod(persistKey) : null,
    )
    const [derivedKey, setDerivedKey] = useState<Uint8Array | null>(
        () => shouldPersist ? readPersistedKey(persistKey) : null,
    )
    const [derivationStatus, setDerivationStatus] = useState<'idle' | 'signing'>('idle')
    const [derivationMessage, setDerivationMessage] = useState('')
    const [prfSupport, setPrfSupport] = useState<PrfSupportResult | null>(null)
    const [credentialVersion, setCredentialVersion] = useState(0)

    // Wallet context (optional — works outside TrainProvider too)
    const walletCtx = useWalletContextOptional()

    // Passkey storage: use provided, or create persistent/in-memory based on persist option
    const passkeyStorageRef = useRef<PasskeyCredentialStorage | undefined>(undefined)
    if (!passkeyStorageRef.current) {
        passkeyStorageRef.current = options?.passkeyStorage ??
            (shouldPersist ? new LocalStoragePasskeyStorage() : undefined)
    }
    const passkeyStorage = passkeyStorageRef.current

    const isLoggedIn = !!method && !!derivedKey

    // Persist derivedKey and method to localStorage
    useEffect(() => {
        if (!shouldPersist || typeof window === 'undefined') return
        try {
            if (derivedKey && method) {
                localStorage.setItem(`${persistKey}:derivedKey`, uint8ArrayToHex(derivedKey))
                localStorage.setItem(`${persistKey}:method`, method)
            } else {
                localStorage.removeItem(`${persistKey}:derivedKey`)
                localStorage.removeItem(`${persistKey}:method`)
            }
        } catch { /* ignore */ }
    }, [derivedKey, method, shouldPersist, persistKey])

    const loginWithPasskey = useCallback(async (options?: PasskeyLoginOptions) => {
        setDerivationStatus('signing')
        setDerivationMessage('Confirm with passkey')
        try {
            let key: Uint8Array
            let credentialId: string

            if (options?.forceCreate) {
                // Force create a new passkey (tries PRF during creation for single-prompt flow)
                const result = await sdkRegisterPasskey(true, options.label, passkeyStorage)
                if (result.key) {
                    key = result.key
                    credentialId = result.credentialId
                } else {
                    // PRF not available during creation, need one more prompt
                    ;({ key, credentialId } = await deriveKeyWithPasskey(
                        { createIfMissing: false },
                        passkeyStorage,
                    ))
                }
            } else {
                // crossDevice: only authenticate with existing passkey (no auto-creation)
                // Normal: use existing passkey or create if missing
                ;({ key, credentialId } = await deriveKeyWithPasskey(
                    { createIfMissing: !options?.crossDevice },
                    passkeyStorage,
                ))
            }

            passkeyStorage?.storeCredentialId(credentialId)
            setDerivedKey(key)
            setMethod('passkey')
            setCredentialVersion(v => v + 1)
        } finally {
            setDerivationStatus('idle')
            setDerivationMessage('')
        }
    }, [passkeyStorage])

    const loginWithWallet = useCallback(async (chainNamespace: string, config?: Record<string, unknown>) => {
        // Resolve config: explicit > adapter > error
        const resolvedConfig = config ?? (await walletCtx?.getLoginConfig(chainNamespace))
        if (!resolvedConfig) {
            throw new Error(
                `No login config available for "${chainNamespace}". ` +
                `Either pass config explicitly or ensure the wallet adapter implements getLoginConfig() and the wallet is connected.`
            )
        }

        setDerivationStatus('signing')
        setDerivationMessage('Please sign in wallet')
        try {
            const key = await deriveKeyFromWallet(chainNamespace, resolvedConfig)
            setDerivedKey(key)
            setMethod('wallet_sign')
        } finally {
            setDerivationStatus('idle')
            setDerivationMessage('')
        }
    }, [walletCtx])

    const logout = useCallback(() => {
        setMethod(null)
        setDerivedKey(null)
    }, [])

    const deriveSecret = useCallback((nonce?: number) => {
        if (!derivedKey) return null
        const timestamp = nonce ?? Date.now()
        const secretBytes = deriveSecretFromTimelock(derivedKey, timestamp)
        const secret = '0x' + uint8ArrayToHex(secretBytes)
        const hashlock = secretToHashlock(secret)
        return { secret, nonce: timestamp, hashlock }
    }, [derivedKey])

    const registerPasskey = useCallback(async (displayName?: string) => {
        setDerivationStatus('signing')
        setDerivationMessage('Register passkey')
        try {
            const { credentialId, key } = await sdkRegisterPasskey(true, displayName, passkeyStorage)
            if (key) {
                setDerivedKey(key)
                setMethod('passkey')
            }
            passkeyStorage?.storeCredentialId(credentialId)
            setCredentialVersion(v => v + 1)
        } finally {
            setDerivationStatus('idle')
            setDerivationMessage('')
        }
    }, [passkeyStorage])

    const passkeyCredentials = passkeyStorage?.getAllCredentialIds() ?? []
    // credentialVersion is used to trigger re-read after mutations
    void credentialVersion

    const removePasskeyCredential = useCallback((id: string) => {
        passkeyStorage?.removeCredentialId?.(id)
        setCredentialVersion(v => v + 1)
    }, [passkeyStorage])

    const checkPasskeySupport = useCallback(async () => {
        const result = await checkPrfSupport()
        setPrfSupport(result)
        return result
    }, [])

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
        removePasskeyCredential,
        prfSupport,
        checkPasskeySupport,
    }
}
