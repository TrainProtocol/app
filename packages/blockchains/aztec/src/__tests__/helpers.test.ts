import { describe, expect, it, vi } from 'vitest'
import type { Wallet } from '@aztec/aztec.js/wallet'
import { registerContractCompat } from '../client/helpers'

function legacyReturnError() {
    return Object.assign(new Error('Invalid input'), {
        name: 'ZodError',
        issues: [{
            expected: 'void',
            code: 'invalid_type',
            path: [],
            message: 'Invalid input',
        }],
    })
}

describe('registerContractCompat', () => {
    it('accepts the legacy wallet return-value mismatch', async () => {
        const registerContract = vi.fn().mockRejectedValue(legacyReturnError())
        const wallet = { registerContract } as unknown as Wallet
        const instance = { address: { toString: () => '0x1234' } } as never

        await expect(registerContractCompat(wallet, instance)).resolves.toBeUndefined()
        await expect(registerContractCompat(wallet, instance)).resolves.toBeUndefined()
        expect(registerContract).toHaveBeenCalledOnce()
    })

    it('preserves real registration failures', async () => {
        const failure = new Error('Registration rejected')
        const wallet = {
            registerContract: vi.fn().mockRejectedValue(failure),
        } as unknown as Wallet

        await expect(registerContractCompat(wallet, {} as never)).rejects.toBe(failure)
    })
})
