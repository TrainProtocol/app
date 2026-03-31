import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { resolveLock, parseSecret } from '../resolveLock'
import { NATIVE_SOL_ADDRESS } from '../constants'

const hashlock = '0x' + 'ab'.repeat(32)

// Helper to create a mock PublicKey-like object for testing
// We use real PublicKey since @solana/web3.js is available as a dep
function mockUserLock(overrides: Record<string, any> = {}) {
    const defaultSender = PublicKey.unique()
    const defaultRecipient = PublicKey.unique()
    const defaultTokenMint = PublicKey.unique()

    return {
        sender: overrides.sender ?? defaultSender,
        recipient: overrides.recipient ?? defaultRecipient,
        tokenMint: overrides.tokenMint ?? defaultTokenMint,
        amount: overrides.amount ?? new BN('1000000000'),
        timelock: overrides.timelock ?? new BN('1700000000'),
        secret: overrides.secret ?? new Array(32).fill(0),
        status: overrides.status ?? 1,
        ...overrides,
    }
}

describe('Solana resolveLock', () => {
    it('resolves a basic user lock', () => {
        const data = mockUserLock()
        const result = resolveLock(data, hashlock, 9)

        expect(result).not.toBeNull()
        expect(result!.sender).toBe(data.sender.toString())
        expect(result!.recipient).toBe(data.recipient.toString())
        expect(result!.amount).toBe(1)
        expect(result!.timelock).toBe(1700000000)
        expect(result!.secret).toBeUndefined()
        expect(result!.token).toBe(data.tokenMint.toString())
    })

    it('returns null when sender is NATIVE_SOL_ADDRESS', () => {
        const data = mockUserLock({ sender: new PublicKey(NATIVE_SOL_ADDRESS) })
        expect(resolveLock(data, hashlock, 9)).toBeNull()
    })

    it('maps NATIVE_SOL_ADDRESS tokenMint to undefined (native SOL)', () => {
        const data = mockUserLock({ tokenMint: new PublicKey(NATIVE_SOL_ADDRESS) })
        const result = resolveLock(data, hashlock, 9)
        expect(result!.token).toBeUndefined()
    })

    it('normalizes hashlock with 0x prefix', () => {
        const data = mockUserLock()
        const result = resolveLock(data, '0xaabb', 9)
        expect(result!.hashlock).toBe('0xaabb')

        const result2 = resolveLock(data, 'aabb', 9)
        expect(result2!.hashlock).toBe('0xaabb')
    })

    it('parses non-zero secret bytes', () => {
        const secretBytes = new Array(32).fill(0)
        secretBytes[0] = 0xde
        secretBytes[1] = 0xad
        const data = mockUserLock({ secret: secretBytes })
        const result = resolveLock(data, hashlock, 9)
        expect(result!.secret).toBeDefined()
        expect(typeof result!.secret).toBe('bigint')
    })

    it('maps all-zero secret to undefined', () => {
        const data = mockUserLock({ secret: new Array(32).fill(0) })
        const result = resolveLock(data, hashlock, 9)
        expect(result!.secret).toBeUndefined()
    })

    it('formats amount with correct decimals', () => {
        const data = mockUserLock({ amount: new BN('1500000') })
        const result = resolveLock(data, hashlock, 6)
        expect(result!.amount).toBe(1.5)
    })

    it('maps status values correctly', () => {
        for (const [input, expected] of [
            [0, LockStatus.Empty],
            [1, LockStatus.Pending],
            [2, LockStatus.Refunded],
            [3, LockStatus.Redeemed],
        ] as const) {
            const data = mockUserLock({ status: input })
            const result = resolveLock(data, hashlock, 9)
            expect(result!.status).toBe(expected)
        }
    })

    it('resolves solver lock with reward fields', () => {
        const data = {
            ...mockUserLock({ amount: new BN('2000000000') }),
            reward: new BN('100000000'),
            rewardTimelock: new BN('1700001000'),
            rewardRecipient: PublicKey.unique(),
            rewardTokenMint: PublicKey.unique(),
        }
        const result = resolveLock(data, hashlock, 9)
        expect(result!.reward).toBe(100000000)
        expect(result!.rewardTimelock).toBe(1700001000)
        expect(result!.rewardRecipient).toBe(data.rewardRecipient.toString())
        expect(result!.rewardToken).toBe(data.rewardTokenMint.toString())
    })

    it('maps NATIVE_SOL_ADDRESS rewardTokenMint to undefined', () => {
        const data = {
            ...mockUserLock(),
            reward: new BN('0'),
            rewardTimelock: new BN('0'),
            rewardRecipient: PublicKey.unique(),
            rewardTokenMint: new PublicKey(NATIVE_SOL_ADDRESS),
        }
        const result = resolveLock(data, hashlock, 9)
        expect(result!.rewardToken).toBeUndefined()
    })

    it('does not include reward fields for user locks', () => {
        const data = mockUserLock()
        const result = resolveLock(data, hashlock, 9)
        expect(result!.reward).toBeUndefined()
        expect(result!.rewardTimelock).toBeUndefined()
        expect(result!.rewardRecipient).toBeUndefined()
        expect(result!.rewardToken).toBeUndefined()
    })
})

describe('Solana parseSecret', () => {
    it('returns undefined for all-zero bytes', () => {
        expect(parseSecret(new Array(32).fill(0))).toBeUndefined()
    })

    it('returns bigint for non-zero bytes', () => {
        const bytes = new Array(32).fill(0)
        bytes[31] = 1
        expect(typeof parseSecret(bytes)).toBe('bigint')
    })

    it('handles Uint8Array input', () => {
        const arr = new Uint8Array(32)
        arr[0] = 0xff
        expect(parseSecret(arr)).toBeDefined()
    })
})

describe('Solana recoverSwap tx hash validation', () => {
    const regex = /^[1-9A-HJ-NP-Za-km-z]{43,88}$/

    it('accepts valid Solana base58 tx hashes', () => {
        expect(regex.test('5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW')).toBe(true)
    })

    it('rejects invalid formats', () => {
        expect(regex.test('0xabc')).toBe(false)
        expect(regex.test('short')).toBe(false)
    })
})
