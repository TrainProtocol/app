import { describe, expect, it, vi } from 'vitest'
import { AztecAddress } from '@aztec/aztec.js/addresses'
import type { AztecNode } from '@aztec/aztec.js/node'
import type { Wallet } from '@aztec/aztec.js/wallet'

const { getPublicEventsMock } = vi.hoisted(() => ({
    getPublicEventsMock: vi.fn(),
}))

vi.mock('@aztec/aztec.js/events', () => ({
    getPublicEvents: getPublicEventsMock,
}))

import { findEventDataFromLogs, registerContractCompat } from '../client/helpers'

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

describe('findEventDataFromLogs', () => {
    it('queries and maps the domain-tagged UserLocked event', async () => {
        const node = {} as AztecNode
        const txHash = `0x${'11'.repeat(32)}`
        const contractAddress = AztecAddress.ZERO.toString()
        const hashlockBytes = Array.from({ length: 32 }, (_, index) => index)
        const hashlock = `0x${hashlockBytes
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('')}`
        const toFixedBytes = (value: string, length: number) => {
            const bytes = Array.from(new TextEncoder().encode(value))
            return [...bytes, ...new Array(length - bytes.length).fill(0)]
        }

        getPublicEventsMock.mockResolvedValueOnce({
            events: [{
                event: {
                    hashlock: hashlockBytes,
                    dst_chain: toFixedBytes('eip155:1', 30),
                    dst_address: toFixedBytes('0xrecipient', 90),
                    dst_amount: 123n,
                    dst_token: toFixedBytes('0xtoken', 90),
                    user_data: toFixedBytes('user-data', 256),
                    solver_data: toFixedBytes('solver-data', 256),
                },
            }],
        })

        await expect(findEventDataFromLogs(
            node,
            txHash,
            contractAddress,
            hashlock,
        )).resolves.toEqual({
            dstChain: 'eip155:1',
            dstAddress: '0xrecipient',
            dstAmount: 123n,
            dstToken: '0xtoken',
            userData: 'user-data',
            solverData: 'solver-data',
        })

        expect(getPublicEventsMock).toHaveBeenCalledOnce()
        const [queriedNode, , filter] = getPublicEventsMock.mock.calls[0]
        expect(queriedNode).toBe(node)
        expect(filter.contractAddress.toString()).toBe(contractAddress)
        expect(filter.txHash.toString()).toBe(txHash)
    })
})
