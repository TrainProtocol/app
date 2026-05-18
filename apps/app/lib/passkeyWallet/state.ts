/**
 * Module-level bridge between the passkey login flow (which lives inside a
 * React hook) and the wagmi connector (instantiated at module load, outside
 * React). The login flow writes the derived EVM account here; the connector
 * reads it on connect.
 *
 * No private key material flows through this module — only the public address
 * + credentialId, plus callbacks to trigger login/sign assertions.
 */

import type { Address } from 'viem'

export type PasskeyWalletState = {
    address: Address | null
    credentialId: string | null
}

type EnsureLoginHandler = () => Promise<{ address: Address }>
/**
 * Returns a fresh, transferable ArrayBuffer holding the raw passkey PRF output
 * (32 bytes). The caller MUST transfer the buffer into a worker for a single
 * signing operation. The worker runs HKDF on the PRF to derive the wallet seed
 * inside its own scope — the seed never exists on the main thread.
 */
type SignHandler = () => Promise<ArrayBuffer>

let state: PasskeyWalletState = { address: null, credentialId: null }
const listeners = new Set<(s: PasskeyWalletState) => void>()
let ensureLoginHandler: EnsureLoginHandler | null = null
let signHandler: SignHandler | null = null

export function getPasskeyWalletState(): PasskeyWalletState {
    return state
}

export function setPasskeyWalletAccount(
    address: Address | null,
    credentialId: string | null,
): void {
    state = { address, credentialId }
    for (const cb of listeners) {
        // Isolate listeners so a throw in one doesn't skip the rest.
        try { cb(state) } catch { /* ignore */ }
    }
}

export function subscribePasskeyWalletState(cb: (s: PasskeyWalletState) => void): () => void {
    listeners.add(cb)
    return () => {
        listeners.delete(cb)
    }
}

export function registerPasskeyWalletLoginHandler(handler: EnsureLoginHandler | null): void {
    ensureLoginHandler = handler
}

export function registerPasskeyWalletSignHandler(handler: SignHandler | null): void {
    signHandler = handler
}

export async function ensurePasskeyWalletLogin(): Promise<{ address: Address }> {
    if (state.address) return { address: state.address }
    if (!ensureLoginHandler) {
        throw new Error('Train Wallet is not initialized — log in with passkey first.')
    }
    return ensureLoginHandler()
}

/**
 * Trigger a fresh passkey assertion and return the raw PRF output as a
 * transferable ArrayBuffer. Call exactly once per signing operation; transfer
 * the buffer into the signer worker, which runs HKDF + signs and zeros both
 * the PRF view and the derived seed after use.
 *
 * This is the user-verification gate: every signing operation goes through here.
 */
export async function getPasskeyWalletPrf(): Promise<ArrayBuffer> {
    if (!signHandler) {
        throw new Error('Train Wallet is not initialized — log in with passkey first.')
    }
    return signHandler()
}
