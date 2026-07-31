import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { resolveUserLock } from '../client/public/getUserLockDetails'
import { resolveSolverLock } from '../client/public/getSolverLockDetails'
import { ZERO_ADDRESS } from '../constants'

const hashlock = '0x' + 'ab'.repeat(32)

describe('EVM resolveUserLock', () => {
    it('resolves a basic user lock', () => {
        const result = resolveUserLock({
            sender: '0xSender', recipient: '0xRecipient', token: '0xToken',
            amount: 1000000000000000000n, timelock: 1700000000n,
            status: 1n, secret: 0n, refundTo: '0xRefund',
            payoutCurve: '0xCurve', payoutCurveData: '0x1234',
        }, hashlock, 18)
        expect(result).not.toBeNull()
        expect(result!.sender).toBe('0xSender')
        expect(result!.recipient).toBe('0xRecipient')
        expect(result!.token).toBe('0xToken')
        expect(result!.amount).toBe(1)
        expect(result!.payoutCurve).toBe('0xCurve')
        expect(result!.payoutCurveData).toBe('0x1234')
        expect(result!.timelock).toBe(1700000000)
        expect(result!.status).toBe(LockStatus.Pending)
    })

    it('normalizes the zero curve to null so it reads as "no curve"', () => {
        const result = resolveUserLock({
            sender: '0xS', recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 0n, status: 1n, secret: 0n,
            refundTo: '0xRefund', payoutCurve: ZERO_ADDRESS, payoutCurveData: '0x',
        }, hashlock, 18)
        expect(result!.payoutCurve).toBeNull()
    })

    it('returns null when sender is ZERO_ADDRESS', () => {
        expect(resolveUserLock({
            sender: ZERO_ADDRESS, recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 0n, status: 0n, secret: 0n,
        }, hashlock, 18)).toBeNull()
    })

    it('formats amount with correct decimals', () => {
        const result = resolveUserLock({
            sender: '0xS', recipient: '0xR', token: '0xT',
            amount: 1500000n, timelock: 0n, status: 0n, secret: 0n,
            refundTo: '0xRefund', payoutCurve: '0xCurve', payoutCurveData: '0x',
        }, hashlock, 6)
        expect(result!.amount).toBe(1.5)
    })

    it('maps status values correctly', () => {
        for (const [input, expected] of [[0n, LockStatus.Empty], [1n, LockStatus.Pending], [2n, LockStatus.Refunded], [3n, LockStatus.Redeemed]] as const) {
            const result = resolveUserLock({
                sender: '0xS', recipient: '0xR', token: '0xT',
                amount: 0n, timelock: 0n, status: input, secret: 0n,
                refundTo: '0xRefund', payoutCurve: '0xCurve', payoutCurveData: '0x',
            }, hashlock, 18)
            expect(result!.status).toBe(expected)
        }
    })
})

describe('EVM resolveSolverLock', () => {
    it('resolves solver lock with reward fields', () => {
        const result = resolveSolverLock({
            sender: '0xSolver', recipient: '0xUser', token: '0xToken',
            amount: 2000000000000000000n, timelock: 1700000000n, status: 1n, secret: 0n,
            reward: 100n, rewardTimelock: 1700001000n,
            rewardRecipient: '0xRR', rewardToken: '0xRT', payoutCurve: ZERO_ADDRESS,
            payoutCurveData: '0x1234',
        }, hashlock, 18, 1)
        expect(result).not.toBeNull()
        expect(result!.amount).toBe(2)
        expect(result!.reward).toBe(100)
        expect(result!.rewardTimelock).toBe(1700001000)
        expect(result!.rewardRecipient).toBe('0xRR')
        expect(result!.rewardToken).toBe('0xRT')
        expect(result!.payoutCurve).toBeNull()
        expect(result!.payoutCurveData).toBe('0x1234')
        expect(result!.index).toBe(1)
    })

    it('returns null when sender is ZERO_ADDRESS', () => {
        expect(resolveSolverLock({
            sender: ZERO_ADDRESS, recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 0n, status: 0n, secret: 0n,
            reward: 0n, rewardTimelock: 0n, rewardRecipient: ZERO_ADDRESS, rewardToken: ZERO_ADDRESS,
        }, hashlock, 18, 1)).toBeNull()
    })

    it('includes index in result', () => {
        const result = resolveSolverLock({
            sender: '0xS', recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 0n, status: 1n, secret: 0n,
            reward: 0n, rewardTimelock: 0n, rewardRecipient: '0xRR', rewardToken: '0xRT',
            payoutCurve: ZERO_ADDRESS, payoutCurveData: '0x',
        }, hashlock, 18, 3)
        expect(result!.index).toBe(3)
    })

    it('preserves an active payout curve for verification', () => {
        const payoutCurve = '0x0000000000000000000000000000000000000001'
        const result = resolveSolverLock({
            sender: '0xS', recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 0n, status: 1n, secret: 0n,
            reward: 0n, rewardTimelock: 0n, rewardRecipient: '0xRR', rewardToken: '0xRT',
            payoutCurve, payoutCurveData: '0xabcd',
        }, hashlock, 18, 1)
        expect(result!.payoutCurve).toBe(payoutCurve)
        expect(result!.payoutCurveData).toBe('0xabcd')
    })

    it('fails closed when the payout curve field is unavailable', () => {
        expect(() => resolveSolverLock({
            sender: '0xS', recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 0n, status: 1n, secret: 0n,
            reward: 0n, rewardTimelock: 0n, rewardRecipient: '0xRR', rewardToken: '0xRT',
        }, hashlock, 18, 1)).toThrow('payout policy is unavailable')
    })
})
