import { useMemo } from 'react'
import { useAtomicState } from '@/context/atomicContext'
import { useSecretDerivationStore } from '@/stores/secretDerivationStore'
import { LoginIdentity } from '@/stores/secretDerivationStore'
import { deriveSecretFromTimelock, secretToHashlock } from '@train-protocol/sdk'
import type { IdentityWarning } from './useLoginIdentityMismatch'

/**
 * Cryptographic identity check for recovered swaps that lack loginIdentity metadata.
 * Derives a test hashlock from the current login key + on-chain nonce and compares
 * it to the actual on-chain hashlock. Skips entirely for normal swaps (loginIdentity present).
 */
export function useRecoveryIdentityCheck(loginIdentity: LoginIdentity | undefined): IdentityWarning {
    const { hashlock, sourceDetails } = useAtomicState()
    const storedDerivedKey = useSecretDerivationStore(s => s.storedDerivedKey)
    const isLoggedIn = useSecretDerivationStore(s => s.isLoggedIn)

    return useMemo(() => {
        if (loginIdentity) return null

        if (!isLoggedIn || !storedDerivedKey) {
            if (!hashlock) return null
            return {
                header: 'Login required',
                details: 'Please log in to continue this swap.',
            }
        }

        if (!hashlock || !sourceDetails?.userData) return null

        const nonce = Number(sourceDetails.userData)
        if (isNaN(nonce)) return null

        try {
            const derivedSecret = deriveSecretFromTimelock(storedDerivedKey, nonce)
            const testHashlock = secretToHashlock('0x' + derivedSecret.toString('hex'))

            if (testHashlock.toLowerCase() === hashlock.toLowerCase()) return null

            return {
                header: 'Identity mismatch',
                details: 'The current login does not match the identity that created this swap. Please log in with the correct passkey or wallet to continue.',
            }
        } catch {
            return null
        }
    }, [loginIdentity, hashlock, sourceDetails?.userData, storedDerivedKey, isLoggedIn])
}
