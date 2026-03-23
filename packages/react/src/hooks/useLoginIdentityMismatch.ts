import { useMemo } from 'react'
import { formatPasskeyIdForDisplay } from '@train-protocol/auth'
import { useOptionalSecretDerivation } from '../providers/SecretDerivationProvider'
import type { DerivationMethod } from '../types'
import type { LoginWalletInfo } from '../internal/secretDerivationStore'

export type LoginIdentity =
    | { method: 'passkey'; credentialId: string }
    | { method: 'wallet_sign'; providerName: string; displayName: string; address: string }

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

export interface LoginIdentityState {
    method: DerivationMethod | null
    isLoggedIn: boolean
    loginWallet: LoginWalletInfo | null
    activePasskeyCredentialId: string | null
}

/**
 * Check whether the current login identity matches a swap's stored login identity.
 *
 * When used inside `<TrainProvider>`, reads login state from context automatically.
 * Otherwise, pass the current login state explicitly via `currentState`.
 */
export function useLoginIdentityMismatch(
    swapLoginIdentity: LoginIdentity | undefined,
    currentState?: LoginIdentityState,
): IdentityMismatchResult {
    const ctx = useOptionalSecretDerivation()

    const method = currentState?.method ?? ctx?.method ?? null
    const isLoggedIn = currentState?.isLoggedIn ?? ctx?.isLoggedIn ?? false
    const loginWallet = currentState?.loginWallet ?? ctx?.loginWallet ?? null
    const activePasskeyCredentialId = currentState?.activePasskeyCredentialId ?? ctx?.activePasskeyCredentialId ?? null

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
            isMismatched = swapLoginIdentity.address.toLowerCase() !== loginWallet.address.toLowerCase()
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
