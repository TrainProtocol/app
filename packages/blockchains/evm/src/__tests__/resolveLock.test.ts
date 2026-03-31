import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { resolveLock } from '../resolveLock'
import { ZERO_ADDRESS } from '../constants'

const hashlock = '0x' + 'ab'.repeat(32)

describe('EVM resolveLock', () => {
    it('resolves a basic user lock', () => {
        const result = resolveLock({
            sender: '0xSender',
            recipient: '0xRecipient',
            token: '0xToken',
            amount: 1000000000000000000n,
            timelock: 1700000000n,
            status: 1n,
            secret: 0n,
        }, hashlock, 18)

        expect(result).not.toBeNull()
        expect(result!.sender).toBe('0xSender')
        expect(result!.recipient).toBe('0xRecipient')
        expect(result!.token).toBe('0xToken')
        expect(result!.amount).toBe(1)
        expect(result!.timelock).toBe(1700000000)
        expect(result!.status).toBe(LockStatus.Pending)
        expect(result!.secret).toBeUndefined()
    })

    it('maps ZERO_ADDRESS recipient to undefined', () => {
        const result = resolveLock({
            sender: '0xSender', recipient: ZERO_ADDRESS, token: '0xToken',
            amount: 0n, timelock: 0n, status: 0n, secret: 0n,
        }, hashlock, 18)
        expect(result!.recipient).toBeUndefined()
    })

    it('maps ZERO_ADDRESS token to undefined', () => {
        const result = resolveLock({
            sender: '0xSender', recipient: '0xRecipient', token: ZERO_ADDRESS,
            amount: 0n, timelock: 0n, status: 0n, secret: 0n,
        }, hashlock, 18)
        expect(result!.token).toBeUndefined()
    })

    it('parses non-zero secret as bigint', () => {
        const result = resolveLock({
            sender: '0xSender', recipient: '0xRecipient', token: '0xToken',
            amount: 0n, timelock: 0n, status: 0n, secret: 12345n,
        }, hashlock, 18)
        expect(result!.secret).toBe(12345n)
    })

    it('maps zero secret to undefined', () => {
        const result = resolveLock({
            sender: '0xSender', recipient: '0xRecipient', token: '0xToken',
            amount: 0n, timelock: 0n, status: 0n, secret: 0n,
        }, hashlock, 18)
        expect(result!.secret).toBeUndefined()
    })

    it('formats amount with correct decimals', () => {
        const result = resolveLock({
            sender: '0xSender', recipient: '0xRecipient', token: '0xToken',
            amount: 1500000n, timelock: 0n, status: 0n, secret: 0n,
        }, hashlock, 6)
        expect(result!.amount).toBe(1.5)
    })

    it('maps status values correctly', () => {
        for (const [input, expected] of [
            [0n, LockStatus.Empty],
            [1n, LockStatus.Pending],
            [2n, LockStatus.Refunded],
            [3n, LockStatus.Redeemed],
        ] as const) {
            const result = resolveLock({
                sender: '0xS', recipient: ZERO_ADDRESS, token: ZERO_ADDRESS,
                amount: 0n, timelock: 0n, status: input, secret: 0n,
            }, hashlock, 18)
            expect(result!.status).toBe(expected)
        }
    })

    it('resolves solver lock with reward fields', () => {
        const result = resolveLock({
            sender: '0xSolver', recipient: '0xUser', token: '0xToken',
            amount: 2000000000000000000n, timelock: 1700000000n, status: 1n, secret: 0n,
            reward: 100000000000000000n, rewardTimelock: 1700001000n,
            rewardRecipient: '0xRewardRecipient', rewardToken: '0xRewardToken',
        }, hashlock, 18)
        expect(result!.reward).toBe(0.1)
        expect(result!.rewardTimelock).toBe(1700001000)
        expect(result!.rewardRecipient).toBe('0xRewardRecipient')
        expect(result!.rewardToken).toBe('0xRewardToken')
    })

    it('maps ZERO_ADDRESS rewardRecipient and rewardToken to undefined', () => {
        const result = resolveLock({
            sender: '0xSolver', recipient: '0xUser', token: '0xToken',
            amount: 0n, timelock: 0n, status: 0n, secret: 0n,
            reward: 0n, rewardTimelock: 0n,
            rewardRecipient: ZERO_ADDRESS, rewardToken: ZERO_ADDRESS,
        }, hashlock, 18)
        expect(result!.rewardRecipient).toBeUndefined()
        expect(result!.rewardToken).toBeUndefined()
    })

    it('uses rewardTokenDecimals when provided', () => {
        const result = resolveLock({
            sender: '0xSolver', recipient: '0xUser', token: '0xToken',
            amount: 1000000000000000000n, timelock: 0n, status: 0n, secret: 0n,
            reward: 500000n, rewardTimelock: 0n, rewardRecipient: '0xR', rewardToken: '0xRT',
        }, hashlock, 18, 6)
        expect(result!.reward).toBe(0.5)
    })

    it('falls back to assetDecimals for reward when rewardTokenDecimals not provided', () => {
        const result = resolveLock({
            sender: '0xSolver', recipient: '0xUser', token: '0xToken',
            amount: 1000000n, timelock: 0n, status: 0n, secret: 0n,
            reward: 500000n, rewardTimelock: 0n, rewardRecipient: '0xR', rewardToken: '0xRT',
        }, hashlock, 6)
        expect(result!.amount).toBe(1)
        expect(result!.reward).toBe(0.5)
    })

    it('does not include reward fields for user locks', () => {
        const result = resolveLock({
            sender: '0xUser', recipient: '0xRecipient', token: '0xToken',
            amount: 0n, timelock: 0n, status: 0n, secret: 0n,
        }, hashlock, 18)
        expect(result!.reward).toBeUndefined()
        expect(result!.rewardTimelock).toBeUndefined()
        expect(result!.rewardRecipient).toBeUndefined()
        expect(result!.rewardToken).toBeUndefined()
    })
})

describe('EVM recoverSwap tx hash validation', () => {
    const regex = /^0x[a-fA-F0-9]{64}$/

    it('accepts valid EVM tx hash', () => {
        expect(regex.test('0x' + 'a'.repeat(64))).toBe(true)
    })

    it('rejects invalid formats', () => {
        expect(regex.test('invalid')).toBe(false)
        expect(regex.test('0x123')).toBe(false)
        expect(regex.test('0x' + 'g'.repeat(64))).toBe(false)
    })
})
