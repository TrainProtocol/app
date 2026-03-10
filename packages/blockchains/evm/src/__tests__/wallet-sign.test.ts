import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock SDK before importing wallet-sign
vi.mock('@train-protocol/sdk', () => ({
    deriveKeyMaterial: vi.fn().mockReturnValue(new Uint8Array(32).fill(0xab)),
    IDENTITY_SALT: 'train-identity-salt',
}))

import { deriveKeyFromEvmSignature } from '../login/wallet-sign.js'
import type { Eip1193Provider } from '../login/wallet-sign.js'
import { deriveKeyMaterial } from '@train-protocol/sdk'

function createMockProvider(overrides?: Partial<Eip1193Provider>): Eip1193Provider {
    return {
        request: vi.fn().mockResolvedValue('0x' + 'ab'.repeat(65)),
        ...overrides,
    }
}

describe('deriveKeyFromEvmSignature', () => {
    let mockProvider: Eip1193Provider

    beforeEach(() => {
        vi.clearAllMocks()
        mockProvider = createMockProvider()
    })

    it('returns Buffer from deriveKeyMaterial', async () => {
        const result = await deriveKeyFromEvmSignature(mockProvider, '0xabc')

        expect(Buffer.isBuffer(result)).toBe(true)
        expect(deriveKeyMaterial).toHaveBeenCalled()
    })

    it('switches chain before signing when currentChainId differs', async () => {
        const calls: string[] = []
        const provider = createMockProvider({
            request: vi.fn().mockImplementation(async (args: { method: string }) => {
                calls.push(args.method)
                if (args.method === 'eth_signTypedData_v4') return '0x' + 'ab'.repeat(65)
            }),
        })

        await deriveKeyFromEvmSignature(provider, '0xabc', {
            sandbox: false,
            currentChainId: 137,
        })

        expect(calls[0]).toBe('wallet_switchEthereumChain')
        expect(calls[1]).toBe('eth_signTypedData_v4')
    })

    it('does not switch chain when already on correct chain', async () => {
        await deriveKeyFromEvmSignature(mockProvider, '0xabc', {
            sandbox: false,
            currentChainId: 1,
        })

        // Should only call signTypedData, not switchChain
        const methods = (mockProvider.request as any).mock.calls.map(
            (c: any) => c[0].method
        )
        expect(methods).not.toContain('wallet_switchEthereumChain')
    })

    it('throws descriptive error when chain switch fails', async () => {
        const provider = createMockProvider({
            request: vi.fn().mockRejectedValue(new Error('user rejected')),
        })

        await expect(
            deriveKeyFromEvmSignature(provider, '0xabc', {
                sandbox: false,
                currentChainId: 137,
            })
        ).rejects.toThrow('Please switch to Mainnet')
    })

    it('throws descriptive error when signing fails', async () => {
        const provider = createMockProvider({
            request: vi.fn().mockRejectedValue(new Error('user denied')),
        })

        await expect(
            deriveKeyFromEvmSignature(provider, '0xabc')
        ).rejects.toThrow('Signing failed')
    })

    it('strips 0x prefix from signature before creating Buffer', async () => {
        const provider = createMockProvider({
            request: vi.fn().mockResolvedValue('0xaabbccdd'),
        })

        await deriveKeyFromEvmSignature(provider, '0xabc')

        // deriveKeyMaterial should receive the raw hex bytes (without 0x)
        const inputMaterial = (deriveKeyMaterial as any).mock.calls[0][0]
        expect(inputMaterial).toEqual(Buffer.from('aabbccdd', 'hex'))
    })
})
