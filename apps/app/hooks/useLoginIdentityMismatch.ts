import { useMemo } from 'react'
import { LoginIdentity } from '@/stores/swapStore'
import { useSecretDerivationStore } from '@/stores/secretDerivationStore'

export type IdentityMismatchResult = {
    isMismatched: boolean
    swapIdentity: LoginIdentity | undefined
}

export function useLoginIdentityMismatch(swapLoginIdentity: LoginIdentity | undefined): IdentityMismatchResult {
    const method = useSecretDerivationStore(s => s.method)
    const loginWallet = useSecretDerivationStore(s => s.loginWallet)
    const activePasskeyCredentialId = useSecretDerivationStore(s => s.activePasskeyCredentialId)
    const isLoggedIn = useSecretDerivationStore(s => s.isLoggedIn)

    return useMemo(() => {
        const base = { swapIdentity: swapLoginIdentity }

        // No stored identity (old swap) or user not logged in — cannot determine mismatch
        if (!swapLoginIdentity || !isLoggedIn || !method) {
            return { ...base, isMismatched: false }
        }

        // Method mismatch (passkey vs wallet_sign)
        if (swapLoginIdentity.method !== method) {
            return { ...base, isMismatched: true }
        }

        // Both wallet_sign — check address
        if (swapLoginIdentity.method === 'wallet_sign' && method === 'wallet_sign' && loginWallet) {
            const addressMismatch = swapLoginIdentity.address.toLowerCase() !== (loginWallet.address as string).toLowerCase()
            return { ...base, isMismatched: addressMismatch }
        }

        // Both passkey — check credential ID
        if (swapLoginIdentity.method === 'passkey' && method === 'passkey' && activePasskeyCredentialId) {
            const credentialMismatch = swapLoginIdentity.credentialId !== activePasskeyCredentialId
            return { ...base, isMismatched: credentialMismatch }
        }

        return { ...base, isMismatched: false }
    }, [swapLoginIdentity, method, loginWallet, activePasskeyCredentialId, isLoggedIn])
}
