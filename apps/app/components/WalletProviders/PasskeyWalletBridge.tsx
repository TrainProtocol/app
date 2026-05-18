"use client"

import { useEffect, useRef } from "react"
import { useOptionalSecretDerivation } from "@train-protocol/react"
import { derivePasskeyWalletPrf } from "@train-protocol/auth"
import {
    getPasskeyWalletState,
    registerPasskeyWalletLoginHandler,
    registerPasskeyWalletSignHandler,
    setPasskeyWalletAccount,
} from "@/lib/passkeyWallet/state"
import { listPasskeyWalletAccounts } from "@/lib/passkeyWallet/storage"
import { loginPasskeyWallet, logoutPasskeyWallet } from "@/lib/passkeyWallet/login"

/**
 * Wires the wallet to SD, without SD having to know about wallets:
 *
 * - **Login handler**: when the wagmi connector or any other consumer calls
 *   `ensurePasskeyWalletLogin()`, this handler runs `loginPasskeyWallet(sd)`,
 *   which orchestrates the dual-derivation (HTLC key + wallet seed) in a
 *   single passkey assertion and writes the HTLC key into SD via the generic
 *   `loginWithPasskeyDerived` primitive.
 * - **Sign handler**: invoked for EVERY signing operation. Triggers a fresh
 *   `navigator.credentials.get()` so user verification is required per signature.
 * - **IDB rehydration**: the wallet singleton is module-level state, lost on
 *   reload. We restore the address (public) from IndexedDB on boot so the
 *   wagmi connector's `isAuthorized()` reads true without prompting.
 * - **Logout sync**: when SD's method becomes null (HTLC logout), the wallet
 *   tears down its worker and singleton.
 */
export function PasskeyWalletBridge() {
    const sd = useOptionalSecretDerivation()

    useEffect(() => {
        let cancelled = false
        listPasskeyWalletAccounts()
            .then((accounts) => {
                if (cancelled || accounts.length === 0) return
                if (getPasskeyWalletState().address) return
                const account = [...accounts].sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0]
                setPasskeyWalletAccount(account.address, account.credentialId)
            })
            .catch(() => { /* IDB blocked / unavailable — fresh-login flow takes over */ })
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        if (!sd) return

        registerPasskeyWalletLoginHandler(async () => {
            await loginPasskeyWallet(sd)
            const state = getPasskeyWalletState()
            if (!state.address) {
                throw new Error('Passkey login completed but no wallet address was derived')
            }
            return { address: state.address }
        })

        registerPasskeyWalletSignHandler(async () => {
            const credentialId = getPasskeyWalletState().credentialId ?? undefined
            const { prfBuffer } = await derivePasskeyWalletPrf({ credentialId })
            return prfBuffer
        })

        return () => {
            registerPasskeyWalletLoginHandler(null)
            registerPasskeyWalletSignHandler(null)
        }
    }, [sd])

    // Tear down wallet-side state when SD transitions out of a logged-in state.
    // Fires on `sd.logout()` regardless of who triggered it (sidebar, /wallet,
    // session reset). Initial mount with `method === null` is a no-op since
    // `wasLoggedInRef` starts as false.
    const wasLoggedInRef = useRef(false)
    useEffect(() => {
        if (!sd) return
        const isLogged = sd.method === 'passkey'
        if (wasLoggedInRef.current && !isLogged) {
            logoutPasskeyWallet()
        }
        wasLoggedInRef.current = isLogged
    }, [sd, sd?.method])

    return null
}
