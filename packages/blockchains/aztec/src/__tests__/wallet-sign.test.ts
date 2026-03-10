import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@train-protocol/sdk', () => ({
    deriveKeyMaterial: vi.fn().mockReturnValue(new Uint8Array(32).fill(0xab)),
    IDENTITY_SALT: 'train-identity-salt',
}))

vi.mock('@aztec/aztec.js/fields', () => ({
    Fr: {
        fromBuffer: vi.fn().mockReturnValue({ toBuffer: () => Buffer.alloc(32) }),
    },
}))

vi.mock('@aztec/aztec.js/addresses', () => ({
    AztecAddress: {
        fromString: vi.fn((s: string) => ({ toString: () => s })),
    },
}))

import { deriveKeyFromAztecWallet, type AztecWalletLike } from '../login/wallet-sign.js'
import { deriveKeyMaterial } from '@train-protocol/sdk'

function createMockWallet(overrides?: Partial<AztecWalletLike>): AztecWalletLike {
    return {
        createAuthWit: vi.fn().mockResolvedValue({
            toBuffer: () => Buffer.from('mockwitness'),
        }),
        ...overrides,
    }
}

describe('deriveKeyFromAztecWallet', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        ;(deriveKeyMaterial as any).mockReturnValue(new Uint8Array(32).fill(0xab))
    })

    it('returns Buffer from deriveKeyMaterial', async () => {
        const wallet = createMockWallet()
        const result = await deriveKeyFromAztecWallet(wallet, '0xaddr')

        expect(Buffer.isBuffer(result)).toBe(true)
        expect(deriveKeyMaterial).toHaveBeenCalled()
    })

    it('throws when wallet is falsy', async () => {
        await expect(
            deriveKeyFromAztecWallet(null as any, '0xaddr')
        ).rejects.toThrow('Aztec wallet not connected')
    })
})
