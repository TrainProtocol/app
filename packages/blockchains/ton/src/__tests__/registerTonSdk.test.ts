import { describe, it, expect, beforeEach } from 'vitest'
import {
    getRegisteredNamespaces,
    createHTLCClient,
} from '@train-protocol/sdk'
import {
    getRegisteredWalletSignProviders,
    deriveKeyFromWallet,
} from '@train-protocol/auth'

import { registerTonSdk } from '../index.js'

describe('registerTonSdk', () => {
    beforeEach(() => {
        registerTonSdk()
    })

    it('registers the ton HTLC client', () => {
        expect(getRegisteredNamespaces()).toContain('ton')
    })

    it('registers the ton wallet-sign provider', () => {
        expect(getRegisteredWalletSignProviders()).toContain('ton')
    })

    it('createHTLCClient works for ton after registration', () => {
        const client = createHTLCClient('ton', {
            rpcUrl: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        })
        expect(client).toBeDefined()
        expect(typeof client.getUserLockDetails).toBe('function')
        expect(typeof client.getSolverLockDetails).toBe('function')
        expect(typeof client.userLock).toBe('function')
        expect(typeof client.refund).toBe('function')
        expect(typeof client.redeemSolver).toBe('function')
    })

    it('deriveKeyFromWallet is callable for ton after registration', async () => {
        await expect(
            deriveKeyFromWallet('ton', { wallet: null as any })
        ).rejects.toThrow()

        try {
            await deriveKeyFromWallet('ton', { wallet: null as any })
        } catch (e: unknown) {
            expect((e as Error).message).not.toContain('No wallet sign registered')
        }
    })

    it('multiple calls do not throw or double-register', () => {
        expect(() => registerTonSdk()).not.toThrow()

        const namespaces = getRegisteredNamespaces().filter(ns => ns === 'ton')
        expect(namespaces).toHaveLength(1)
    })
})
