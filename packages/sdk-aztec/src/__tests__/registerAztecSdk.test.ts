import { describe, it, expect, beforeEach } from 'vitest'
import {
    getRegisteredNamespaces,
    createHTLCClient,
} from '@train-protocol/sdk'
import { registerAztecSdk } from '../index.js'
import { TrainApiClient } from '@train-protocol/sdk'
const mockApiClient = {} as TrainApiClient

describe('registerAztecSdk', () => {
    // Note: because the registry is a global singleton and registerAztecSdk is
    // idempotent (guarded by a module-level flag), these tests run in sequence
    // and the first call registers while subsequent calls are no-ops.

    beforeEach(() => {
        registerAztecSdk()
    })

    it('registers the AZTEC_TESTNET HTLC client', () => {
        expect(getRegisteredNamespaces()).toContain('AZTEC_TESTNET')
    })

    it('createHTLCClient works for AZTEC_TESTNET after registration', () => {
        const client = createHTLCClient('AZTEC_TESTNET', { rpcUrl: 'https://example.com', apiClient: mockApiClient })
        expect(client).toBeDefined()
        expect(typeof client.getUserLockDetails).toBe('function')
        expect(typeof client.getSolverLockDetails).toBe('function')
        expect(typeof client.createHTLC).toBe('function')
        expect(typeof client.refund).toBe('function')
        expect(typeof client.claim).toBe('function')
    })

    it('multiple calls do not throw or double-register', () => {
        expect(() => registerAztecSdk()).not.toThrow()

        const namespaces = getRegisteredNamespaces().filter(ns => ns === 'AZTEC_TESTNET')
        expect(namespaces).toHaveLength(1)
    })
})
