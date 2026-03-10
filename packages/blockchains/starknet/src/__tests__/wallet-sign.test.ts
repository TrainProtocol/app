import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@train-protocol/sdk', () => ({
    deriveKeyMaterial: vi.fn().mockReturnValue(new Uint8Array(32).fill(0xab)),
    IDENTITY_SALT: 'train-identity-salt',
}))

import { deriveKeyFromStarknetWallet, type StarknetAccountLike } from '../login/wallet-sign.js'
import { deriveKeyMaterial } from '@train-protocol/sdk'

function createMockAccount(overrides?: Partial<StarknetAccountLike>): StarknetAccountLike {
    return {
        signMessage: vi.fn().mockResolvedValue(['0x1a2b3c', '0x4d5e6f']),
        ...overrides,
    }
}

describe('deriveKeyFromStarknetWallet', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        ;(deriveKeyMaterial as any).mockReturnValue(new Uint8Array(32).fill(0xab))
    })

    it('uses custom chainId when provided', async () => {
        const account = createMockAccount()

        await deriveKeyFromStarknetWallet(account, '0xaddr', { chainId: 'SN_MAIN' })

        const typedData = (account.signMessage as any).mock.calls[0][0]
        expect(typedData.domain.chainId).toBe('SN_MAIN')
    })

    it('returns Buffer from deriveKeyMaterial', async () => {
        const account = createMockAccount()

        const result = await deriveKeyFromStarknetWallet(account, '0xaddr')

        expect(Buffer.isBuffer(result)).toBe(true)
        expect(deriveKeyMaterial).toHaveBeenCalled()
    })

    it('serializes signature array elements into bytes', async () => {
        const account = createMockAccount({
            signMessage: vi.fn().mockResolvedValue(['0xff', '0xaa']),
        })

        await deriveKeyFromStarknetWallet(account, '0xaddr')

        // deriveKeyMaterial receives Buffer of serialized signature bytes
        const inputMaterial = (deriveKeyMaterial as any).mock.calls[0][0]
        expect(Buffer.isBuffer(inputMaterial)).toBe(true)
        expect(inputMaterial.length).toBeGreaterThan(0)
    })

    it('throws when account is falsy', async () => {
        await expect(
            deriveKeyFromStarknetWallet(null as any, '0xaddr')
        ).rejects.toThrow('Starknet wallet not connected')
    })
})
