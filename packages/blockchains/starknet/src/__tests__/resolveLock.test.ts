import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { resolveLock, mapLockStatus } from '../resolveLock'

const hashlock = '0x' + 'ab'.repeat(32)

describe('Starknet resolveLock', () => {
    it('resolves a basic user lock', () => {
        const result = resolveLock({
            sender: 0x123n, recipient: 0x456n, token: 0x789n,
            amount: 1000000000000000000n, timelock: 1700000000n, status: 1, secret: 0n,
        }, hashlock, 18)
        expect(result).not.toBeNull()
        expect(result!.sender).toBe('0x123')
        expect(result!.amount).toBe(1)
        expect(result!.timelock).toBe(1700000000)
        expect(result!.secret).toBeUndefined()
    })

    it('returns null when sender is zero', () => {
        const result = resolveLock({
            sender: 0n, recipient: 0x456n, token: 0x789n,
            amount: 0n, timelock: 0n, status: 0, secret: 0n,
        }, hashlock, 18)
        expect(result).toBeNull()
    })

    it('maps zero recipient to undefined', () => {
        const result = resolveLock({
            sender: 0x123n, recipient: 0n, token: 0x789n,
            amount: 0n, timelock: 0n, status: 1, secret: 0n,
        }, hashlock, 18)
        expect(result!.recipient).toBeUndefined()
    })

    it('maps zero token to undefined', () => {
        const result = resolveLock({
            sender: 0x123n, recipient: 0x456n, token: 0n,
            amount: 0n, timelock: 0n, status: 1, secret: 0n,
        }, hashlock, 18)
        expect(result!.token).toBeUndefined()
    })

    it('parses non-zero secret', () => {
        const result = resolveLock({
            sender: 0x123n, recipient: 0x456n, token: 0x789n,
            amount: 0n, timelock: 0n, status: 1, secret: 42n,
        }, hashlock, 18)
        expect(result!.secret).toBe(42n)
    })

    it('maps zero secret to undefined', () => {
        const result = resolveLock({
            sender: 0x123n, recipient: 0x456n, token: 0x789n,
            amount: 0n, timelock: 0n, status: 1, secret: 0n,
        }, hashlock, 18)
        expect(result!.secret).toBeUndefined()
    })

    it('formats amount with correct decimals', () => {
        const result = resolveLock({
            sender: 0x123n, recipient: 0x456n, token: 0x789n,
            amount: 1500000n, timelock: 0n, status: 1, secret: 0n,
        }, hashlock, 6)
        expect(result!.amount).toBe(1.5)
    })

    it('formats recipient and token addresses with padding', () => {
        const result = resolveLock({
            sender: 0x123n, recipient: 0xabcn, token: 0xdefn,
            amount: 0n, timelock: 0n, status: 1, secret: 0n,
        }, hashlock, 18)
        expect(result!.recipient).toMatch(/^0x0+abc$/)
        expect(result!.recipient!.length).toBe(66)
        expect(result!.token).toMatch(/^0x0+def$/)
        expect(result!.token!.length).toBe(66)
    })

    it('resolves solver lock with reward fields', () => {
        const result = resolveLock({
            sender: 0x123n, recipient: 0x456n, token: 0x789n,
            amount: 2000000000000000000n, timelock: 1700000000n, status: 1, secret: 0n,
            reward: 100000000000000000n, reward_timelock: 1700001000n,
            reward_recipient: 0xaaan, reward_token: 0xbbbn,
        }, hashlock, 18)
        expect(result!.reward).toBe(100000000000000000)
        expect(result!.rewardTimelock).toBe(1700001000)
        expect(result!.rewardRecipient).toBe('0xaaa')
        expect(result!.rewardToken).toBe('0xbbb')
    })

    it('maps zero reward_recipient and reward_token to undefined', () => {
        const result = resolveLock({
            sender: 0x123n, recipient: 0x456n, token: 0x789n,
            amount: 0n, timelock: 0n, status: 1, secret: 0n,
            reward: 0n, reward_timelock: 0n, reward_recipient: 0n, reward_token: 0n,
        }, hashlock, 18)
        expect(result!.rewardRecipient).toBeUndefined()
        expect(result!.rewardToken).toBeUndefined()
    })

    it('does not include reward fields for user locks', () => {
        const result = resolveLock({
            sender: 0x123n, recipient: 0x456n, token: 0x789n,
            amount: 0n, timelock: 0n, status: 1, secret: 0n,
        }, hashlock, 18)
        expect(result!.reward).toBeUndefined()
        expect(result!.rewardTimelock).toBeUndefined()
        expect(result!.rewardRecipient).toBeUndefined()
        expect(result!.rewardToken).toBeUndefined()
    })
})

describe('Starknet mapLockStatus', () => {
    it('handles CairoCustomEnum with activeVariant method', () => {
        expect(mapLockStatus({ activeVariant: () => 'Pending' })).toBe(LockStatus.Pending)
        expect(mapLockStatus({ activeVariant: () => 'Redeemed' })).toBe(LockStatus.Redeemed)
        expect(mapLockStatus({ activeVariant: () => 'Refunded' })).toBe(LockStatus.Refunded)
        expect(mapLockStatus({ activeVariant: () => 'Unknown' })).toBe(LockStatus.Empty)
    })

    it('handles plain number status', () => {
        expect(mapLockStatus(0)).toBe(LockStatus.Empty)
        expect(mapLockStatus(1)).toBe(LockStatus.Pending)
        expect(mapLockStatus(2)).toBe(LockStatus.Refunded)
        expect(mapLockStatus(3)).toBe(LockStatus.Redeemed)
    })

    it('handles plain bigint status', () => {
        expect(mapLockStatus(1n)).toBe(LockStatus.Pending)
        expect(mapLockStatus(3n)).toBe(LockStatus.Redeemed)
    })

    it('handles variant object format', () => {
        expect(mapLockStatus({ variant: { Pending: {} } })).toBe(LockStatus.Pending)
        expect(mapLockStatus({ variant: { Redeemed: {} } })).toBe(LockStatus.Redeemed)
        expect(mapLockStatus({ variant: { Refunded: {} } })).toBe(LockStatus.Refunded)
    })

    it('returns Empty for undefined/null', () => {
        expect(mapLockStatus(undefined)).toBe(LockStatus.Empty)
        expect(mapLockStatus(null)).toBe(LockStatus.Empty)
    })

    it('returns Empty for unrecognized variant object', () => {
        expect(mapLockStatus({ variant: { SomethingElse: {} } })).toBe(LockStatus.Empty)
    })
})

describe('Starknet recoverSwap tx hash validation', () => {
    const regex = /^0x[a-fA-F0-9]{1,64}$/

    it('accepts valid Starknet tx hash formats', () => {
        expect(regex.test('0xabc')).toBe(true)
        expect(regex.test('0x' + 'a'.repeat(64))).toBe(true)
    })

    it('rejects invalid formats', () => {
        expect(regex.test('abc')).toBe(false)
        expect(regex.test('0x')).toBe(false)
        expect(regex.test('0x' + 'a'.repeat(65))).toBe(false)
    })
})
