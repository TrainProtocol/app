import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@train-protocol/sdk', () => ({
    deriveKeyMaterial: vi.fn().mockReturnValue(new Uint8Array(32).fill(0xab)),
    IDENTITY_SALT: 'train-identity-salt',
}))

import { deriveKeyFromSolanaWallet, type SolanaWalletLike } from '../login/wallet-sign.js'
import { deriveKeyMaterial } from '@train-protocol/sdk'

function createMockWallet(overrides?: Partial<SolanaWalletLike>): SolanaWalletLike {
    return {
        signMessage: vi.fn().mockResolvedValue(new Uint8Array(64).fill(0xcc)),
        ...overrides,
    }
}

describe('deriveKeyFromSolanaWallet', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(deriveKeyMaterial as any).mockReturnValue(new Uint8Array(32).fill(0xab))
    })

    it('returns Buffer from deriveKeyMaterial', async () => {
        const wallet = createMockWallet()
        const result = await deriveKeyFromSolanaWallet(wallet)

        expect(Buffer.isBuffer(result)).toBe(true)
        expect(deriveKeyMaterial).toHaveBeenCalled()
    })

    it('throws when wallet is falsy', async () => {
        await expect(
            deriveKeyFromSolanaWallet(null as any)
        ).rejects.toThrow('Solana wallet does not support message signing')
    })

    it('throws when wallet has no signMessage method', async () => {
        await expect(
            deriveKeyFromSolanaWallet({} as any)
        ).rejects.toThrow('Solana wallet does not support message signing')
    })

    it('passes signature bytes to deriveKeyMaterial', async () => {
        const mockSig = new Uint8Array(64).fill(0xff)
        const wallet = createMockWallet({
            signMessage: vi.fn().mockResolvedValue(mockSig),
        })

        await deriveKeyFromSolanaWallet(wallet)

        const inputMaterial = (deriveKeyMaterial as any).mock.calls[0][0]
        expect(inputMaterial).toEqual(mockSig)
    })
})
