import { createStore as createZustandStore } from 'zustand/vanilla'
import type { DerivationMethod } from '../types'
import type { PrfSupportResult } from '@train-protocol/auth'
import type { SecureStorage } from './SecureStorage'

/** Minimal login wallet info for UI display */
export interface LoginWalletInfo {
    address: string
    providerName: string
    displayName?: string
    chainId?: string | number
}

const DERIVED_KEY_STORAGE_KEY = 'derived-key'
const AUTH_META_STORAGE_KEY = 'auth-meta'

interface AuthMeta {
    method: DerivationMethod
    loginWallet: LoginWalletInfo | null
}

export interface SecretDerivationStoreState {
    // Persisted state
    method: DerivationMethod | null
    derivedKey: Uint8Array | null
    loginWallet: LoginWalletInfo | null

    // Hydration state
    hydrated: boolean

    // Transient state
    derivationStatus: 'idle' | 'signing'
    derivationMessage: string
    prfSupport: PrfSupportResult | null
    credentialVersion: number

    // Actions
    setLogin: (method: DerivationMethod, key: Uint8Array) => void
    setLoginWallet: (wallet: LoginWalletInfo | null) => void
    setDerivationStatus: (status: 'idle' | 'signing') => void
    setDerivationMessage: (message: string) => void
    setPrfSupport: (result: PrfSupportResult | null) => void
    bumpCredentialVersion: () => void
    logout: () => void

    /** Load encrypted state from IndexedDB. Call once after SecureStorage.init(). */
    hydrate: (storage: SecureStorage) => Promise<void>
}

export interface CreateSecretDerivationStoreOptions {
    persist?: boolean
}

export function createSecretDerivationStore(options?: CreateSecretDerivationStoreOptions) {
    const shouldPersist = options?.persist === true

    // SecureStorage ref — populated by hydrate(), used by actions for persistence
    let secureStorage: SecureStorage | null = null

    return createZustandStore<SecretDerivationStoreState>()((set, get) => ({
        method: null,
        derivedKey: null,
        loginWallet: null,
        hydrated: !shouldPersist,
        derivationStatus: 'idle',
        derivationMessage: '',
        prfSupport: null,
        credentialVersion: 0,

        setLogin: (method, key) => {
            set({ method, derivedKey: key })
            if (secureStorage) {
                secureStorage.encryptAndStore(DERIVED_KEY_STORAGE_KEY, key).catch(() => {})
                const meta: AuthMeta = { method, loginWallet: get().loginWallet }
                secureStorage.setJSON(AUTH_META_STORAGE_KEY, meta).catch(() => {})
            }
        },

        setLoginWallet: (wallet) => {
            set({ loginWallet: wallet })
            if (secureStorage) {
                const method = get().method
                if (method) {
                    const meta: AuthMeta = { method, loginWallet: wallet }
                    secureStorage.setJSON(AUTH_META_STORAGE_KEY, meta).catch(() => {})
                }
            }
        },

        setDerivationStatus: (status) => set({ derivationStatus: status }),
        setDerivationMessage: (message) => set({ derivationMessage: message }),
        setPrfSupport: (result) => set({ prfSupport: result }),
        bumpCredentialVersion: () => set((s) => ({ credentialVersion: s.credentialVersion + 1 })),

        logout: () => {
            set({ method: null, derivedKey: null, loginWallet: null })
            if (secureStorage) {
                secureStorage.clear().catch(() => {})
            }
        },

        hydrate: async (storage) => {
            secureStorage = storage
            try {
                const [derivedKey, meta] = await Promise.all([
                    storage.loadAndDecrypt(DERIVED_KEY_STORAGE_KEY),
                    storage.getJSON<AuthMeta>(AUTH_META_STORAGE_KEY),
                ])

                if (derivedKey && meta?.method) {
                    set({
                        method: meta.method,
                        derivedKey,
                        loginWallet: meta.loginWallet ?? null,
                        hydrated: true,
                    })
                    return
                }
            } catch { /* ignore — start fresh */ }

            set({ hydrated: true })
        },
    }))
}

export type SecretDerivationStore = ReturnType<typeof createSecretDerivationStore>
