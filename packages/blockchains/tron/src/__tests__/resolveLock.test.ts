import { describe, it, expect } from 'vitest'
import type { UserLockParams } from '@train-protocol/sdk'
import { resolveUserLock } from '../client/public/getUserLockDetails'
import { resolveSolverLock } from '../client/public/getSolverLockDetails'
import { buildUserLockTx } from '../client/wallet/buildUserLockTx'
import { ZERO_ADDRESS } from '../constants'

const hashlock = '0x' + 'ab'.repeat(32)

describe('Tron resolveUserLock', () => {
    it('resolves a basic user lock', () => {
        const result = resolveUserLock({
            sender: '0xSender', recipient: '0xRecipient', token: '0xToken',
            amount: 1000000n, timelock: 1700000000n, status: 1n, secret: 0n,
            payoutCurve: '0xCurve', payoutCurveData: '0x1234',
        }, hashlock, 6)
        expect(result).not.toBeNull()
        expect(result!.amount).toBe(1)
        expect(result!.payoutCurveData).toBe('0x1234')
        expect(result!.timelock).toBe(1700000000)
    })

    it('returns null when sender is ZERO_ADDRESS', () => {
        expect(resolveUserLock({
            sender: ZERO_ADDRESS, recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 1n, status: 0n, secret: 0n,
        }, hashlock, 18)).toBeNull()
    })

    it('returns null when timelock is falsy', () => {
        expect(resolveUserLock({
            sender: '0xS', recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 0n, status: 0n, secret: 0n,
        }, hashlock, 18)).toBeNull()
    })

    it('formats amount with correct decimals', () => {
        const result = resolveUserLock({
            sender: '0xS', recipient: '0xR', token: '0xT',
            amount: 1500000n, timelock: 1700000000n, status: 1n, secret: 0n,
            payoutCurve: '0xCurve', payoutCurveData: '0x',
        }, hashlock, 6)
        expect(result!.amount).toBe(1.5)
    })

    it('keeps legacy locks refundable while marking their payout policy unavailable', () => {
        const result = resolveUserLock({
            sender: '0xS', recipient: '0xR', token: '0xT',
            amount: 1n, timelock: 1700000000n, status: 1n, secret: 0n,
        }, hashlock, 6)
        expect(result!.payoutCurve).toBe('')
        expect(result!.payoutCurveData).toBe('0x')
    })
})

describe('Tron resolveSolverLock', () => {
    it('resolves solver lock with reward fields', () => {
        const result = resolveSolverLock({
            sender: '0xSolver', recipient: '0xUser', token: '0xToken',
            amount: 2000000n, timelock: 1700000000n, status: 1n, secret: 0n,
            reward: 0n, rewardTimelock: 0n, rewardRecipient: ZERO_ADDRESS,
            rewardToken: ZERO_ADDRESS, payoutCurve: ZERO_ADDRESS, payoutCurveData: '0x1234',
        }, hashlock, 6)
        expect(result).not.toBeNull()
        expect(result!.amount).toBe(2)
        expect(result!.payoutCurve).toBeNull()
        expect(result!.payoutCurveData).toBe('0x1234')
    })

    it('returns null when sender is ZERO_ADDRESS', () => {
        expect(resolveSolverLock({
            sender: ZERO_ADDRESS, recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 0n, status: 0n, secret: 0n,
        }, hashlock, 18)).toBeNull()
    })

    it('marks a legacy-ABI decode unavailable instead of claiming "no curve"', () => {
        const result = resolveSolverLock({
            sender: '0xSolver', recipient: '0xUser', token: '0xToken',
            amount: 0n, timelock: 1700000000n, status: 1n, secret: 0n,
            reward: 0n, rewardTimelock: 0n, rewardRecipient: ZERO_ADDRESS, rewardToken: ZERO_ADDRESS,
        }, hashlock, 18)
        expect(result!.payoutCurve).toBe('')
        expect(result!.payoutCurveData).toBe('0x')
    })

    it('preserves an active payout curve for verification', () => {
        const payoutCurve = '0x0000000000000000000000000000000000000001'
        const result = resolveSolverLock({
            sender: '0xSolver', recipient: '0xUser', token: '0xToken',
            amount: 0n, timelock: 1700000000n, status: 1n, secret: 0n,
            reward: 0n, rewardTimelock: 0n, rewardRecipient: ZERO_ADDRESS,
            rewardToken: ZERO_ADDRESS, payoutCurve, payoutCurveData: '0xabcd',
        }, hashlock, 18)
        expect(result!.payoutCurve).toBe(payoutCurve)
    })
})

describe('Tron buildUserLockTx', () => {
    it('refuses to lock funds when the legacy ABI cannot commit the payout policy', () => {
        expect(() => buildUserLockTx({
            payoutCurve: '0x0000000000000000000000000000000000000001',
            payoutCurveData: '0x1234',
        } as UserLockParams)).toThrow('does not support payout-curve commitments')
    })
})
