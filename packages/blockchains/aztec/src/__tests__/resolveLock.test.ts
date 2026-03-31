import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { resolveLock, parseSecret } from '../resolveLock'

const hashlock = '0x' + 'ab'.repeat(32)

describe('Aztec resolveLock', () => {
    it('resolves a basic user lock', () => {
        const result = resolveLock({
            sender: { toString: () => '0x1234' }, recipient: { toString: () => '0x5678' },
            token: { toString: () => '0x9abc' },
            amount: 1000000000000000000n, timelock: 1700000000n, status: 1,
            secret: new Array(32).fill(0),
        }, hashlock, 18)
        expect(result).not.toBeNull()
        expect(result!.sender).toBe('0x1234')
        expect(result!.recipient).toBe('0x5678')
        expect(result!.amount).toBe(1)
        expect(result!.timelock).toBe(1700000000)
        expect(result!.status).toBe(LockStatus.Pending)
        expect(result!.secret).toBeUndefined()
    })

    it('returns null when status is 0 (Empty)', () => {
        const result = resolveLock({
            sender: { toString: () => '0x1234' }, recipient: { toString: () => '0x5678' },
            token: { toString: () => '0x9abc' },
            amount: 0n, timelock: 0n, status: 0, secret: [],
        }, hashlock, 18)
        expect(result).toBeNull()
    })

    it('handles undefined sender/recipient/token', () => {
        const result = resolveLock({
            sender: undefined, recipient: undefined, token: undefined,
            amount: 0n, timelock: 0n, status: 1, secret: [],
        }, hashlock, 18)
        expect(result!.sender).toBeUndefined()
        expect(result!.recipient).toBeUndefined()
        expect(result!.token).toBeUndefined()
    })

    it('formats amount with correct decimals', () => {
        const result = resolveLock({
            sender: { toString: () => 'S' }, recipient: { toString: () => 'R' },
            token: { toString: () => 'T' },
            amount: 1500000n, timelock: 0n, status: 1, secret: [],
        }, hashlock, 6)
        expect(result!.amount).toBe(1.5)
    })

    it('parses non-zero secret from byte array', () => {
        const secretBytes = new Array(32).fill(0)
        secretBytes[0] = 0xde
        secretBytes[1] = 0xad
        const result = resolveLock({
            sender: { toString: () => 'S' }, recipient: { toString: () => 'R' },
            token: { toString: () => 'T' },
            amount: 0n, timelock: 0n, status: 1, secret: secretBytes,
        }, hashlock, 18)
        expect(result!.secret).toBeDefined()
        expect(result!.secret! > 0n).toBe(true)
    })

    it('maps all-zero secret bytes to undefined', () => {
        const result = resolveLock({
            sender: { toString: () => 'S' }, recipient: { toString: () => 'R' },
            token: { toString: () => 'T' },
            amount: 0n, timelock: 0n, status: 1, secret: new Array(32).fill(0),
        }, hashlock, 18)
        expect(result!.secret).toBeUndefined()
    })

    it('resolves solver lock with reward fields', () => {
        const result = resolveLock({
            sender: { toString: () => '0xSolver' }, recipient: { toString: () => '0xUser' },
            token: { toString: () => '0xToken' },
            amount: 2000000000000000000n, timelock: 1700000000n, status: 1,
            secret: new Array(32).fill(0),
            reward: 100000000000000000n, reward_timelock: 1700001000n,
            reward_recipient: { toString: () => '0xRewardR' },
            reward_token: { toString: () => '0xRewardT' },
        }, hashlock, 18)
        expect(result!.reward).toBe(100000000000000000)
        expect(result!.rewardTimelock).toBe(1700001000)
        expect(result!.rewardRecipient).toBe('0xRewardR')
        expect(result!.rewardToken).toBe('0xRewardT')
    })

    it('does not include reward fields for user locks', () => {
        const result = resolveLock({
            sender: { toString: () => 'S' }, recipient: { toString: () => 'R' },
            token: { toString: () => 'T' },
            amount: 0n, timelock: 0n, status: 1, secret: [],
        }, hashlock, 18)
        expect(result!.reward).toBeUndefined()
        expect(result!.rewardTimelock).toBeUndefined()
        expect(result!.rewardRecipient).toBeUndefined()
        expect(result!.rewardToken).toBeUndefined()
    })

    it('maps all status values correctly', () => {
        for (const [input, expected] of [
            [0, null],
            [1, LockStatus.Pending],
            [2, LockStatus.Refunded],
            [3, LockStatus.Redeemed],
        ] as const) {
            const result = resolveLock({
                sender: { toString: () => 'S' }, recipient: { toString: () => 'R' },
                token: { toString: () => 'T' },
                amount: 0n, timelock: 0n, status: input, secret: [],
            }, hashlock, 18)
            if (expected === null) expect(result).toBeNull()
            else expect(result!.status).toBe(expected)
        }
    })
})

describe('Aztec parseSecret', () => {
    it('returns undefined for all-zero bytes', () => {
        expect(parseSecret(new Array(32).fill(0))).toBeUndefined()
    })

    it('returns bigint for non-zero bytes', () => {
        const bytes = new Array(32).fill(0)
        bytes[0] = 0xff
        expect(typeof parseSecret(bytes)).toBe('bigint')
    })

    it('returns undefined for empty array', () => {
        expect(parseSecret([])).toBeUndefined()
    })

    it('returns undefined for null/undefined', () => {
        expect(parseSecret(null)).toBeUndefined()
        expect(parseSecret(undefined)).toBeUndefined()
    })

    it('handles single-byte secret', () => {
        expect(parseSecret([0xab])).toBe(0xabn)
    })
})

describe('Aztec recoverSwap tx hash validation', () => {
    const regex = /^0x[a-fA-F0-9]{1,64}$/

    it('accepts valid Aztec tx hash formats', () => {
        expect(regex.test('0xabc')).toBe(true)
        expect(regex.test('0x' + 'a'.repeat(64))).toBe(true)
        expect(regex.test('0x1')).toBe(true)
    })

    it('rejects invalid formats', () => {
        expect(regex.test('abc')).toBe(false)
        expect(regex.test('0x')).toBe(false)
        expect(regex.test('0x' + 'a'.repeat(65))).toBe(false)
    })
})
