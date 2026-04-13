import { describe, it, expect, beforeEach } from 'vitest'
import { getRegisteredNamespaces, createHTLCPublicClient } from '@train-protocol/sdk'
import { registerStarknetSdk } from '../index'

describe('registerStarknetSdk', () => {
    beforeEach(() => { registerStarknetSdk() })

    it('registers the starknet namespace', () => {
        expect(getRegisteredNamespaces()).toContain('starknet')
    })

    it('creates a public client with required methods', () => {
        const client = createHTLCPublicClient('starknet', {
            rpcUrl: 'https://starknet-sepolia.example.com',
        })
        expect(typeof client.getUserLockDetails).toBe('function')
        expect(typeof client.getSolverLockDetails).toBe('function')
    })
})
