// Compatibility shim — bridges @train-protocol/sdk passkey functions with app's zustand store
import {
    checkPrfSupport,
    formatPasskeyIdForDisplay,
    getPasskeyPrfSalt,
    mapPasskeyError,
    registerPasskey as sdkRegisterPasskey,
    deriveKeyWithPasskey as sdkDeriveKeyWithPasskey,
    PasskeyCredentialStorage,
} from '@train-protocol/sdk'
import { useSecretDerivationStore } from '@/stores/secretDerivationStore'

// Re-export pure functions & types
export {
    checkPrfSupport,
    formatPasskeyIdForDisplay,
    getPasskeyPrfSalt,
    mapPasskeyError,
}
export type {
    PasskeyCredentialStorage,
    PrfSupportResult,
    RegisterPasskeyResult,
} from '@train-protocol/sdk'

// Storage backed by the app's zustand store
function getZustandStorage(): PasskeyCredentialStorage {
    return {
        getActiveCredentialId: () => useSecretDerivationStore.getState().activePasskeyCredentialId ?? null,
        getAllCredentialIds: () => useSecretDerivationStore.getState().passkeyCredentialIds ?? [],
        storeCredentialId: (credId: string) => useSecretDerivationStore.getState().addPasskeyCredential(credId),
    }
}

export const getStoredCredentialId = (): string | null =>
    getZustandStorage().getActiveCredentialId()

export const getStoredCredentialIds = (): string[] =>
    getZustandStorage().getAllCredentialIds()

export const storeCredentialId = (credId: string): void =>
    getZustandStorage().storeCredentialId(credId)

export const registerPasskey = (forceCreate?: boolean, displayName?: string) =>
    sdkRegisterPasskey(forceCreate, displayName, getZustandStorage())

export const deriveKeyWithPasskey = (options?: { createIfMissing?: boolean }) =>
    sdkDeriveKeyWithPasskey(options, getZustandStorage())
