/**
 * Wallet-aware passkey login.
 *
 * The wallet owns its own bootstrap: it triggers the passkey assertion via
 * `@train-protocol/auth`, transfers the resulting PRF buffer into its worker
 * (so the wallet seed never lives on the main thread), persists wallet
 * metadata to IndexedDB, and finally hands the derived HTLC key into SD via
 * `loginWithPasskeyDerived` so the rest of the app sees a normal logged-in
 * state.
 *
 * SD has no knowledge of the wallet — it just accepts the HTLC key from the
 * caller's deriver. This is the inversion of the previous design, where SD
 * exposed `onPasskeySession`/`onLogout` wallet-shaped hooks.
 */

import {
    deriveKeyAndPrfWithPasskey,
    registerPasskey as sdkRegisterPasskey,
} from '@train-protocol/auth'
import type { SecretDerivationContextValue } from '@train-protocol/react'
import { passkeyWalletWorker } from './workerClient'
import { setPasskeyWalletAccount } from './state'
import { savePasskeyWalletAccount } from './storage'

export interface LoginPasskeyWalletOptions {
    /** Force-register a new passkey instead of using an existing one */
    forceCreate?: boolean
    /** Display name for the new passkey (only used with forceCreate) */
    label?: string
    /** Only authenticate with an existing passkey, never auto-create */
    crossDevice?: boolean
    /** Target a specific stored credential via WebAuthn allowCredentials */
    credentialId?: string
}

type SDLike = Pick<SecretDerivationContextValue, 'loginWithPasskeyDerived'>

/**
 * Run the wallet's passkey login flow. Drives SD's `loginWithPasskeyDerived`
 * primitive — SD handles status/error/credential-storage state around the
 * call; this function handles the wallet-side concerns (worker, IDB, singleton).
 */
export async function loginPasskeyWallet(
    sd: SDLike,
    options?: LoginPasskeyWalletOptions,
): Promise<void> {
    return sd.loginWithPasskeyDerived(async () => {
        let key: Uint8Array
        let prfBuffer: ArrayBuffer
        let credentialId: string

        if (options?.forceCreate) {
            // Single-prompt registration on browsers that evaluate PRF during
            // .create() (Chrome 132+, Safari 18+ platform authenticators). The
            // returned `prfBuffer` is the same bytes a follow-up .get() would
            // produce, so we hand it straight to the worker and skip the
            // second prompt entirely.
            const result = await sdkRegisterPasskey(true, options.label)
            if (result.key && result.prfBuffer) {
                key = result.key
                prfBuffer = result.prfBuffer
                credentialId = result.credentialId
            } else {
                // Fallback for browsers that don't support PRF eval at create
                // time. Pin the follow-up assertion to the credential we just
                // created — without allowCredentials, the user could pick a
                // different resident Train passkey and we'd derive the wrong
                // wallet.
                ;({ key, prfBuffer, credentialId } = await deriveKeyAndPrfWithPasskey({
                    createIfMissing: false,
                    credentialId: result.credentialId,
                }))
            }
        } else {
            ;({ key, prfBuffer, credentialId } = await deriveKeyAndPrfWithPasskey({
                // Explicit credentialId or crossDevice never auto-creates.
                createIfMissing: !options?.crossDevice && !options?.credentialId,
                credentialId: options?.credentialId,
            }))
        }

        // Transfer PRF to the worker FIRST, before any other awaits. After the
        // postMessage transfer the main-thread buffer view is detached. The
        // worker runs HKDF inside its own scope and zeros PRF + seed before any
        // network I/O.
        const address = await passkeyWalletWorker.deriveAddress(prfBuffer)

        // Persist wallet metadata so future page loads can rehydrate the wallet
        // singleton before any consumer (connector, /wallet page) reads it.
        try {
            await savePasskeyWalletAccount({
                credentialId,
                address,
                displayName: 'Train Wallet',
                createdAt: Date.now(),
                lastUsedAt: Date.now(),
            })
        } catch {
            // IndexedDB failure is non-fatal — the wallet still works for this session.
        }
        setPasskeyWalletAccount(address, credentialId)

        // Surface the user-chosen label to SD so it lands in passkey storage as
        // the credential's display name. Only meaningful on the forceCreate
        // path; for existing credentials SD's storage call is idempotent and
        // preserves whatever label was stored at registration time.
        return { key, credentialId, label: options?.forceCreate ? options.label : undefined }
    })
}

/**
 * Wallet-side logout: clear the worker and singleton. SD logout is the caller's
 * responsibility (it's a separate concern — the user may want to log out of
 * HTLC without wiping the wallet record, though in practice they're paired).
 */
export function logoutPasskeyWallet(): void {
    void passkeyWalletWorker.clear()
    setPasskeyWalletAccount(null, null)
}
