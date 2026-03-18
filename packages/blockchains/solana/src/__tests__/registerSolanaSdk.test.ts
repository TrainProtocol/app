import { describe, it, expect, beforeEach } from 'vitest'
import {
    getRegisteredNamespaces,
    getRegisteredWalletSignProviders,
    createHTLCClient,
    deriveKeyFromWallet,
    type TrainApiClient,
} from '@train-protocol/sdk'
import { registerSolanaSdk } from '../index.js'

const mockApiClient = {} as TrainApiClient

describe('registerSolanaSdk', () => {
    // Note: because the registry is a global singleton and registerSolanaSdk is
    // idempotent (guarded by a module-level flag), these tests run in sequence
    // and the first call registers while subsequent calls are no-ops.

    beforeEach(() => {
        registerSolanaSdk()
    })

    it('registers the solana HTLC client', () => {
        expect(getRegisteredNamespaces()).toContain('solana')
    })

    it('registers the solana wallet-sign provider', () => {
        expect(getRegisteredWalletSignProviders()).toContain('solana')
    })

    it('createHTLCClient works for solana after registration', () => {
        const client = createHTLCClient('solana', { rpcUrl: 'https://api.devnet.solana.com', apiClient: mockApiClient })
        expect(client).toBeDefined()
        expect(typeof client.getUserLockDetails).toBe('function')
        expect(typeof client.getSolverLockDetails).toBe('function')
        expect(typeof client.userLock).toBe('function')
        expect(typeof client.refund).toBe('function')
        expect(typeof client.redeemSolver).toBe('function')
    })

    it('deriveKeyFromWallet is callable for solana after registration', async () => {
        // We can't fully exercise wallet signing without a real Solana wallet,
        // but we verify the factory is wired up (it rejects with a signing error,
        // not a "No wallet sign registered" error).
        const nullWallet = { signMessage: null } as never
        await expect(
            deriveKeyFromWallet('solana', { wallet: nullWallet })
        ).rejects.toThrow()

        // Confirm the error is NOT "No wallet sign registered" — that would mean
        // registration didn't work. Any other error means the factory was found.
        try {
            await deriveKeyFromWallet('solana', { wallet: nullWallet })
        } catch (e: unknown) {
            expect((e as Error).message).not.toContain('No wallet sign registered')
        }
    })

    it('multiple calls do not throw or double-register', () => {
        // Call again — should be a no-op
        expect(() => registerSolanaSdk()).not.toThrow()

        // Still only one solana entry (Map.set overwrites, but the guard prevents even that)
        const namespaces = getRegisteredNamespaces().filter(ns => ns === 'solana')
        expect(namespaces).toHaveLength(1)
    })
})
