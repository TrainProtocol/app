import { describe, it, expect, beforeEach } from 'vitest'
import {
    getRegisteredNamespaces,
    createHTLCClient,
} from '@train-protocol/sdk'
import { registerAztecSdk } from '../index.js'

describe('registerAztecSdk', () => {
    beforeEach(() => {
        registerAztecSdk()
    })

    it('registers the aztec HTLC client', () => {
        expect(getRegisteredNamespaces()).toContain('aztec')
    })

    it('createHTLCClient works for aztec after registration', () => {
        const client = createHTLCClient('aztec', { rpcUrl: 'https://example.com' })
        expect(client).toBeDefined()
        expect(typeof client.getUserLockDetails).toBe('function')
        expect(typeof client.getSolverLockDetails).toBe('function')
        expect(typeof client.userLock).toBe('function')
        expect(typeof client.refund).toBe('function')
        expect(typeof client.redeemSolver).toBe('function')
    })

    it('multiple calls do not throw or double-register', () => {
        expect(() => registerAztecSdk()).not.toThrow()

        const namespaces = getRegisteredNamespaces().filter(ns => ns === 'aztec')
        expect(namespaces).toHaveLength(1)
    })
})
