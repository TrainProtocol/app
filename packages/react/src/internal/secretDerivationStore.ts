import { createStore as createZustandStore } from 'zustand/vanilla'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { DerivationMethod } from '../types'
import type { PrfSupportResult } from '@train-protocol/auth'

/** Minimal login wallet info for UI display */
export interface LoginWalletInfo {
    address: string
    providerName: string
    displayName?: string
    chainId?: string | number
}

export interface SecretDerivationStoreState {
    // Persisted state
    method: DerivationMethod | null
    derivedKey: Uint8Array | null
    loginWallet: LoginWalletInfo | null

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

const initialState = {
    method: null as DerivationMethod | null,
    derivedKey: null as Uint8Array | null,
    loginWallet: null as LoginWalletInfo | null,
    derivationStatus: 'idle' as const,
    derivationMessage: '',
    prfSupport: null as PrfSupportResult | null,
    credentialVersion: 0,
}

type SetFn = (fn: SecretDerivationStoreState | Partial<SecretDerivationStoreState> | ((state: SecretDerivationStoreState) => SecretDerivationStoreState | Partial<SecretDerivationStoreState>)) => void

function createActions(set: SetFn) {
    return {
        setLogin: (method: DerivationMethod, key: Uint8Array) => set({ method, derivedKey: key }),
        setLoginWallet: (wallet: LoginWalletInfo | null) => set({ loginWallet: wallet }),
        setDerivationStatus: (status: 'idle' | 'signing') => set({ derivationStatus: status }),
        setDerivationMessage: (message: string) => set({ derivationMessage: message }),
        setPrfSupport: (result: PrfSupportResult | null) => set({ prfSupport: result }),
        bumpCredentialVersion: () => set((state) => ({ credentialVersion: state.credentialVersion + 1 })),
        logout: () => set({
            method: null,
            derivedKey: null,
            loginWallet: null,
        }),
    }
}

export interface CreateSecretDerivationStoreOptions {
    persist?: boolean
    persistKey?: string
}

export function createSecretDerivationStore(options?: CreateSecretDerivationStoreOptions) {
    const shouldPersist = options?.persist === true
    const persistKey = options?.persistKey ?? 'train:auth'

    if (!shouldPersist) {
        return createZustandStore<SecretDerivationStoreState>()((set) => ({
            ...initialState,
            ...createActions(set),
        }))
    }

    return createZustandStore<SecretDerivationStoreState>()(
        persist(
            (set) => ({
                ...initialState,
                ...createActions(set),
            }),
            {
                name: persistKey,
                storage: createJSONStorage(() => localStorage),
                partialize: (state) => ({
                    method: state.method,
                    derivedKey: state.derivedKey ? uint8ArrayToHex(state.derivedKey) : null,
                    loginWallet: state.loginWallet,
                }),
                merge: (persistedState: any, currentState) => {
                    if (!persistedState) return currentState
                    return {
                        ...currentState,
                        method: persistedState.method ?? currentState.method,
                        derivedKey: typeof persistedState.derivedKey === 'string'
                            ? hexToUint8Array(persistedState.derivedKey)
                            : currentState.derivedKey,
                        loginWallet: persistedState.loginWallet ?? currentState.loginWallet,
                    }
                },
            },
        ),
    )
}

export type SecretDerivationStore = ReturnType<typeof createSecretDerivationStore>
