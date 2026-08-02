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

import { findEventDataFromLogs, payoutCurveDataToBytes, registerContractCompat } from '../client/helpers'

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

describe('payoutCurveDataToBytes', () => {
    // The quote omits payoutCurveData whenever the curve takes no config, which is every
    // swap today. Zero-padding this case is the whole point of the helper: the previous
    // length-validating conversion threw, so no Aztec user lock could be built at all.
    it('zero-fills an absent config', () => {
        for (const value of [undefined, '0x']) {
            const bytes = payoutCurveDataToBytes(value, 128)
            expect(bytes).toHaveLength(128)
            expect(bytes.every(byte => byte === 0)).toBe(true)
        }
    })

    it('right-pads a short config to the fixed width', () => {
        const bytes = payoutCurveDataToBytes('0x1234', 128)
        expect(bytes).toHaveLength(128)
        expect(bytes.slice(0, 2)).toEqual([0x12, 0x34])
        expect(bytes.slice(2).every(byte => byte === 0)).toBe(true)
    })

    it('accepts a config that exactly fills the field', () => {
        const bytes = payoutCurveDataToBytes(`0x${'ab'.repeat(128)}`, 128)
        expect(bytes).toHaveLength(128)
        expect(bytes.every(byte => byte === 0xab)).toBe(true)
    })

    it('throws rather than truncating an oversized config', () => {
        expect(() => payoutCurveDataToBytes(`0x${'ab'.repeat(129)}`, 128))
            .toThrow('Payout curve data must be at most 128 bytes, got 129')
    })

    it('rejects malformed hex instead of reinterpreting it', () => {
        expect(() => payoutCurveDataToBytes('0xabc', 128)).toThrow('Invalid payout curve data hex')
        expect(() => payoutCurveDataToBytes('0xzz', 128)).toThrow('Invalid payout curve data hex')
    })

    it('normalizes casing so equal configs encode identically', () => {
        expect(payoutCurveDataToBytes('0xAB', 128)).toEqual(payoutCurveDataToBytes('0xab', 128))
    })
})

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
                    // The solver's destination-chain address — the only way a swap recovered
                    // from a source tx hash can locate the solver lock.
                    reward_recipient: toFixedBytes('0xsolver', 90),
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
            rewardRecipient: '0xsolver',
        })

        expect(getPublicEventsMock).toHaveBeenCalledOnce()
        const [queriedNode, , filter] = getPublicEventsMock.mock.calls[0]
        expect(queriedNode).toBe(node)
        expect(filter.contractAddress.toString()).toBe(contractAddress)
        expect(filter.txHash.toString()).toBe(txHash)
    })
})
