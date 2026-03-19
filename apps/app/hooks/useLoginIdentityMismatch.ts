import { useMemo } from 'react'
import { LoginIdentity } from '@/stores/swapStore'
import { useSecretDerivationStore } from '@/stores/secretDerivationStore'
import { formatPasskeyIdForDisplay } from '@/lib/htlc/secretDerivation/passkeyService'

export type IdentityWarning = {
    header: string
    details: string
} | null

export type IdentityMismatchResult = {
    isMismatched: boolean
    isLoggedIn: boolean
    warning: IdentityWarning
}

function formatIdentityLabel(identity: LoginIdentity): string {
    if (identity.method === 'passkey') {
        return `passkey ${formatPasskeyIdForDisplay(identity.credentialId)}`
    }
    return `${identity.displayName} (${identity.address.slice(0, 6)}...${identity.address.slice(-4)})`
}

export function useLoginIdentityMismatch(swapLoginIdentity: LoginIdentity | undefined): IdentityMismatchResult {
    const method = useSecretDerivationStore(s => s.method)
    const loginWallet = useSecretDerivationStore(s => s.loginWallet)
    const activePasskeyCredentialId = useSecretDerivationStore(s => s.activePasskeyCredentialId)
    const isLoggedIn = useSecretDerivationStore(s => s.isLoggedIn)

    return useMemo(() => {
        const loggedIn = !!isLoggedIn
        const label = swapLoginIdentity ? formatIdentityLabel(swapLoginIdentity) : null

        // Not logged in — prompt to log in
        if (swapLoginIdentity && !loggedIn) {
            return {
                isMismatched: false,
                isLoggedIn: false,
                warning: {
                    header: 'Login required',
                    details: `Please log in with ${label} to continue this swap.`,
                },
            }
        }

        // No stored identity (old swap) or user not logged in — cannot determine mismatch
        if (!swapLoginIdentity || !isLoggedIn || !method) {
            return { isMismatched: false, isLoggedIn: loggedIn, warning: null }
        }

        // Check mismatch
        let isMismatched = false
        if (swapLoginIdentity.method !== method) {
            isMismatched = true
        } else if (swapLoginIdentity.method === 'wallet_sign' && method === 'wallet_sign' && loginWallet) {
            isMismatched = swapLoginIdentity.address.toLowerCase() !== (loginWallet.address as string).toLowerCase()
        } else if (swapLoginIdentity.method === 'passkey' && method === 'passkey' && activePasskeyCredentialId) {
            isMismatched = swapLoginIdentity.credentialId !== activePasskeyCredentialId
        }

        return {
            isMismatched,
            isLoggedIn: true,
            warning: isMismatched ? {
                header: 'Login method mismatch',
                details: `This swap was created with ${label}. Please log in with the same method to continue.`,
            } : null,
        }
    }, [swapLoginIdentity, method, loginWallet, activePasskeyCredentialId, isLoggedIn])
}
