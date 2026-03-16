import { describe, it, expect, beforeEach } from 'vitest'
import { getRegisteredNamespaces, createHTLCClient } from '@train-protocol/sdk'
import { registerFuelSdk } from '../index'

describe('registerFuelSdk', () => {
    beforeEach(() => {
        registerFuelSdk()
    })

    it('registers the fuel namespace', () => {
        expect(getRegisteredNamespaces()).toContain('fuel')
    })

    it('creates a client with required methods', () => {
        const client = createHTLCClient('fuel', {
            rpcUrl: 'https://mainnet.fuel.network/v1/graphql',
            apiClient: {} as any,
        })
        expect(typeof client.getUserLockDetails).toBe('function')
        expect(typeof client.getSolverLockDetails).toBe('function')
        expect(typeof client.userLock).toBe('function')
        expect(typeof client.refund).toBe('function')
        expect(typeof client.redeemSolver).toBe('function')
    })
})
