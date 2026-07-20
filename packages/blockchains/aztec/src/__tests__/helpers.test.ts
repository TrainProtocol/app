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

    it('retries without the artifact when registration with it is rejected', async () => {
        const registerContract = vi.fn()
            .mockRejectedValueOnce(new Error("Contract artifact doesn't match instance's current class id"))
            .mockResolvedValueOnce(undefined)
        const wallet = { registerContract } as unknown as Wallet
        const instance = { address: { toString: () => '0x1234' } } as never
        const artifact = { name: 'Token' } as never

        await expect(registerContractCompat(wallet, instance, artifact)).resolves.toBeUndefined()
        expect(registerContract).toHaveBeenCalledTimes(2)
        expect(registerContract).toHaveBeenNthCalledWith(1, instance, artifact)
        expect(registerContract).toHaveBeenNthCalledWith(2, instance)
    })

    it('accepts the legacy return-value mismatch on the artifact-less retry', async () => {
        const registerContract = vi.fn()
            .mockRejectedValueOnce(new Error("Contract artifact doesn't match instance's current class id"))
            .mockRejectedValueOnce(legacyReturnError())
        const wallet = { registerContract } as unknown as Wallet
        const instance = { address: { toString: () => '0x1234' } } as never

        await expect(registerContractCompat(wallet, instance, { name: 'Token' } as never)).resolves.toBeUndefined()
        expect(registerContract).toHaveBeenCalledTimes(2)
    })

    it('rethrows the original error when the artifact-less retry also fails', async () => {
        const failure = new Error("Contract artifact doesn't match instance's current class id")
        const registerContract = vi.fn()
            .mockRejectedValueOnce(failure)
            .mockRejectedValueOnce(new Error('Unknown contract class'))
        const wallet = { registerContract } as unknown as Wallet
        const instance = { address: { toString: () => '0x1234' } } as never

        await expect(registerContractCompat(wallet, instance, { name: 'Token' } as never)).rejects.toBe(failure)
        expect(registerContract).toHaveBeenCalledTimes(2)
    })
})
