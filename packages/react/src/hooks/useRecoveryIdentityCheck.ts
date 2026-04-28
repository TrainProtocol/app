import { useMemo, useSyncExternalStore } from 'react'
import { deriveSecretFromTimelock, secretToHashlock, bytesToHex } from '@train-protocol/sdk'
import { useSDStoreContext, useOptionalSecretDerivation } from '../providers/SecretDerivationProvider'
import type { LoginIdentity, IdentityWarning } from './useLoginIdentityMismatch'

export interface RecoveryIdentityCheckInput {
    hashlock: string | null
    userData: string | undefined
    loginIdentity: LoginIdentity | null | undefined
}

/**
 * Cryptographic identity check for swaps without persisted `loginIdentity` metadata
 * (e.g. swaps opened from history or recovered from a tx hash).
 *
 * Derives a candidate secret from the current login key + on-chain nonce, hashes it,
 * and compares against the on-chain hashlock. If they don't match, the wallet/passkey
 * currently logged in is not the one that created the swap.
 *
 * Returns null when `loginIdentity` is set — in that case the metadata-based
 * `useLoginIdentityMismatch` is authoritative and should be used instead.
 */
export function useRecoveryIdentityCheck({
    hashlock,
    userData,
    loginIdentity,
}: RecoveryIdentityCheckInput): IdentityWarning {
    const sdStore = useSDStoreContext()
    const ctx = useOptionalSecretDerivation()

    const derivedKey = useSyncExternalStore(
        (cb) => sdStore?.subscribe(cb) ?? (() => {}),
        () => sdStore?.getState().derivedKey ?? null,
        () => null,
    )
    const isLoggedIn = ctx?.isLoggedIn ?? false

    return useMemo(() => {
        if (loginIdentity) return null
        if (!hashlock) return null

        if (!isLoggedIn || !derivedKey) {
            return {
                header: 'Login required',
                details: 'Please log in to continue this swap.',
            }
        }

        if (!userData) return null
        const nonce = Number(userData)
        if (!Number.isFinite(nonce)) return null

        try {
            const secretBytes = deriveSecretFromTimelock(derivedKey, nonce)
            const secretHex = bytesToHex(Array.from(secretBytes))
            const testHashlock = secretToHashlock(secretHex)

            const normalize = (h: string) => (h.startsWith('0x') ? h : '0x' + h).toLowerCase()
            if (normalize(testHashlock) === normalize(hashlock)) return null

            return {
                header: 'Identity mismatch',
                details: 'The current login does not match the identity that created this swap. Please log in with the correct passkey or wallet to continue.',
            }
        } catch {
            return null
        }
    }, [loginIdentity, hashlock, userData, derivedKey, isLoggedIn])
}
