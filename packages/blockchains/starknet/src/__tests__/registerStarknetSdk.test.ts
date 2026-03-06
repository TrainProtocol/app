import { describe, it, expect, beforeEach } from 'vitest'
import { getRegisteredNamespaces, createHTLCClient } from '@train-protocol/sdk'
import { registerStarknetSdk } from '../index'

describe('registerStarknetSdk', () => {
    beforeEach(() => { registerStarknetSdk() })

    it('registers the starknet namespace', () => {
        expect(getRegisteredNamespaces()).toContain('starknet')
    })

    it('creates a client with required methods', () => {
        const client = createHTLCClient('starknet', {
            rpcUrl: 'https://starknet-sepolia.example.com',
            apiClient: { revealSecret: async () => {} } as any,
        })
        expect(typeof client.getUserLockDetails).toBe('function')
        expect(typeof client.getSolverLockDetails).toBe('function')
        expect(typeof client.userLock).toBe('function')
        expect(typeof client.refund).toBe('function')
        expect(typeof client.redeemSolver).toBe('function')
    })
})
