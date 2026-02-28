import { describe, it, expect, beforeEach } from 'vitest'
import {
    getRegisteredNamespaces,
    getRegisteredWalletSignProviders,
    createHTLCClient,
    deriveKeyFromWallet,
} from '@train-protocol/sdk'
import { registerEvmSdk } from '../index.js'

describe('registerEvmSdk', () => {
    // Note: because the registry is a global singleton and registerEvmSdk is
    // idempotent (guarded by a module-level flag), these tests run in sequence
    // and the first call registers while subsequent calls are no-ops.

    beforeEach(() => {
        registerEvmSdk()
    })

    it('registers the eip155 HTLC client', () => {
        expect(getRegisteredNamespaces()).toContain('eip155')
    })

    it('registers the eip155 wallet-sign provider', () => {
        expect(getRegisteredWalletSignProviders()).toContain('eip155')
    })

    it('createHTLCClient works for eip155 after registration', () => {
        const client = createHTLCClient('eip155', { rpcUrl: 'https://example.com' })
        expect(client).toBeDefined()
        expect(typeof client.getUserLockDetails).toBe('function')
        expect(typeof client.getSolverLockDetails).toBe('function')
    })

    it('deriveKeyFromWallet is callable for eip155 after registration', async () => {
        // We can't fully exercise wallet signing without a real EIP-1193 provider,
        // but we verify the factory is wired up (it rejects with a provider error,
        // not a "no wallet sign registered" error).
        await expect(
            deriveKeyFromWallet('eip155', { provider: null, address: '0x0' })
        ).rejects.toThrow()

        // Confirm the error is NOT "No wallet sign registered" — that would mean
        // registration didn't work. Any other error means the factory was found.
        try {
            await deriveKeyFromWallet('eip155', { provider: null, address: '0x0' })
        } catch (e: unknown) {
            expect((e as Error).message).not.toContain('No wallet sign registered')
        }
    })

    it('multiple calls do not throw or double-register', () => {
        // Call again — should be a no-op
        expect(() => registerEvmSdk()).not.toThrow()

        // Still only one eip155 entry (Map.set overwrites, but the guard prevents even that)
        const namespaces = getRegisteredNamespaces().filter(ns => ns === 'eip155')
        expect(namespaces).toHaveLength(1)
    })
})
