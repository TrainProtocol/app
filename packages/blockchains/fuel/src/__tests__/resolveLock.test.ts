import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { resolveLock, mapLockStatus, ZERO_B256 } from '../resolveLock'

const hashlock = '0x' + 'ab'.repeat(32)
const validSender = '0x' + '11'.repeat(32)

describe('Fuel resolveLock', () => {
    it('resolves a basic user lock', () => {
        const result = resolveLock({
            sender: { bits: validSender },
            srcReceiver: { bits: '0x' + '22'.repeat(32) },
            amount: 1000000000n,
            timelock: '4611686018427387904', // TAI64 value
            secret: 0n,
            status: 0,
        }, hashlock, 9)

        expect(result).not.toBeNull()
        expect(result!.sender).toBe(validSender)
        expect(result!.recipient).toBe('0x' + '22'.repeat(32))
        expect(result!.amount).toBe(1)
        expect(result!.status).toBe(LockStatus.Pending)
        expect(result!.secret).toBeUndefined()
    })

    it('returns null when sender is ZERO_B256', () => {
        const result = resolveLock({
            sender: { bits: ZERO_B256 },
            srcReceiver: { bits: '0x22' },
            amount: 0n, secret: 0n, status: 0,
        }, hashlock, 9)
        expect(result).toBeNull()
    })

    it('returns null when sender bits is null', () => {
        const result = resolveLock({
            sender: { bits: null },
            srcReceiver: { bits: '0x22' },
            amount: 0n, secret: 0n, status: 0,
        }, hashlock, 9)
        expect(result).toBeNull()
    })

    it('returns null when sender is undefined', () => {
        const result = resolveLock({
            sender: undefined,
            srcReceiver: { bits: '0x22' },
            amount: 0n, secret: 0n, status: 0,
        }, hashlock, 9)
        expect(result).toBeNull()
    })

    it('maps undefined srcReceiver to undefined recipient', () => {
        const result = resolveLock({
            sender: { bits: validSender },
            srcReceiver: undefined,
            amount: 0n, secret: 0n, status: 0,
        }, hashlock, 9)
        expect(result!.recipient).toBeUndefined()
    })

    it('parses non-zero secret', () => {
        const result = resolveLock({
            sender: { bits: validSender },
            srcReceiver: { bits: '0x22' },
            amount: 0n, secret: 12345n, status: 0,
        }, hashlock, 9)
        expect(result!.secret).toBe(12345n)
    })

    it('maps zero secret to undefined', () => {
        const result = resolveLock({
            sender: { bits: validSender },
            srcReceiver: { bits: '0x22' },
            amount: 0n, secret: 0n, status: 0,
        }, hashlock, 9)
        expect(result!.secret).toBeUndefined()
    })

    it('maps falsy secret to undefined', () => {
        const result = resolveLock({
            sender: { bits: validSender },
            srcReceiver: { bits: '0x22' },
            amount: 0n, secret: undefined, status: 0,
        }, hashlock, 9)
        expect(result!.secret).toBeUndefined()
    })

    it('formats amount with correct decimals', () => {
        const result = resolveLock({
            sender: { bits: validSender },
            srcReceiver: { bits: '0x22' },
            amount: 1500000n, secret: 0n, status: 0,
        }, hashlock, 6)
        expect(result!.amount).toBe(1.5)
    })

    it('uses claimed field for status when present', () => {
        const result = resolveLock({
            sender: { bits: validSender },
            srcReceiver: { bits: '0x22' },
            amount: 0n, secret: 0n, claimed: 1,
        }, hashlock, 9)
        expect(result!.status).toBe(LockStatus.Redeemed)
    })

    it('falls back to status field when claimed is absent', () => {
        const result = resolveLock({
            sender: { bits: validSender },
            srcReceiver: { bits: '0x22' },
            amount: 0n, secret: 0n, status: 2,
        }, hashlock, 9)
        expect(result!.status).toBe(LockStatus.Refunded)
    })

    it('defaults to 0 (Pending) when both claimed and status are absent', () => {
        const result = resolveLock({
            sender: { bits: validSender },
            srcReceiver: { bits: '0x22' },
            amount: 0n, secret: 0n,
        }, hashlock, 9)
        expect(result!.status).toBe(LockStatus.Pending)
    })

    it('resolves solver lock with reward fields', () => {
        const result = resolveLock({
            sender: { bits: validSender },
            srcReceiver: { bits: '0x' + '22'.repeat(32) },
            amount: 2000000000n, secret: 0n, status: 0,
            reward: 100000000n, rewardTimelock: '4611686018427387904',
        }, hashlock, 9)
        expect(result!.reward).toBe(100000000)
        expect(result!.rewardTimelock).toBeDefined()
    })

    it('does not include reward fields for user locks', () => {
        const result = resolveLock({
            sender: { bits: validSender },
            srcReceiver: { bits: '0x22' },
            amount: 0n, secret: 0n, status: 0,
        }, hashlock, 9)
        expect(result!.reward).toBeUndefined()
        expect(result!.rewardTimelock).toBeUndefined()
    })
})

describe('Fuel mapLockStatus', () => {
    it('maps status values correctly', () => {
        expect(mapLockStatus(0)).toBe(LockStatus.Pending)
        expect(mapLockStatus(1)).toBe(LockStatus.Redeemed)
        expect(mapLockStatus(2)).toBe(LockStatus.Refunded)
    })

    it('returns Empty for unknown status', () => {
        expect(mapLockStatus(3)).toBe(LockStatus.Empty)
        expect(mapLockStatus(99)).toBe(LockStatus.Empty)
        expect(mapLockStatus(-1)).toBe(LockStatus.Empty)
    })
})

describe('Fuel recoverSwap tx hash validation', () => {
    const regex = /^0x[a-fA-F0-9]{64}$/

    it('accepts valid Fuel tx hash', () => {
        expect(regex.test('0x' + 'a'.repeat(64))).toBe(true)
    })

    it('rejects invalid formats', () => {
        expect(regex.test('0x' + 'a'.repeat(63))).toBe(false)
        expect(regex.test('a'.repeat(64))).toBe(false)
    })
})
