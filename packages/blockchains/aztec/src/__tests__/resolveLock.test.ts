import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { resolveUserLock } from '../client/public/getUserLockDetails'
import { resolveSolverLock } from '../client/public/getSolverLockDetails'

const hashlock = '0x' + 'ab'.repeat(32)

describe('Aztec resolveUserLock', () => {
    it('resolves a basic user lock', () => {
        const result = resolveUserLock({
            sender: { toString: () => '0xSender' },
            refund_to: { toString: () =>'0x1234' }, recipient: { toString: () => '0x5678' },
            token: { toString: () => '0x9abc' },
            payout_curve: { toString: () => '0x0abc' }, payout_curve_data: [0x12, 0x34],
            amount: 1000000000000000000n, timelock: 1700000000n, status: 1,
            secret: new Array(32).fill(0),
        }, hashlock, 18)
        expect(result).not.toBeNull()
        expect(result!.sender).toBe('0xSender')
        expect(result!.amount).toBe(1)
        expect(result!.payoutCurve).toBe('0x0abc')
        expect(result!.payoutCurveData).toBe('0x1234')
        expect(result!.status).toBe(LockStatus.Pending)
    })

    it('returns null when status is 0 (Empty)', () => {
        expect(resolveUserLock({
            refund_to: { toString: () =>'0x1234' }, recipient: { toString: () => '0x5678' },
            token: { toString: () => '0x9abc' },
            amount: 0n, timelock: 0n, status: 0, secret: [],
        }, hashlock, 18)).toBeNull()
    })

    it('formats amount with correct decimals', () => {
        const result = resolveUserLock({
            refund_to: { toString: () =>'S' }, recipient: { toString: () => 'R' },
            token: { toString: () => 'T' },
            payout_curve: { toString: () => '0x0abc' }, payout_curve_data: [],
            amount: 1500000n, timelock: 0n, status: 1, secret: [],
        }, hashlock, 6)
        expect(result!.amount).toBe(1.5)
    })

    it('parses non-zero secret from byte array', () => {
        const secretBytes = new Array(32).fill(0)
        secretBytes[0] = 0xde
        const result = resolveUserLock({
            refund_to: { toString: () =>'S' }, recipient: { toString: () => 'R' },
            token: { toString: () => 'T' },
            payout_curve: { toString: () => '0x0abc' }, payout_curve_data: [],
            amount: 0n, timelock: 0n, status: 1, secret: secretBytes,
        }, hashlock, 18)
        expect(result!.secret > 0n).toBe(true)
    })
})

describe('Aztec resolveSolverLock', () => {
    it('resolves solver lock with reward fields and index', () => {
        const result = resolveSolverLock({
            sender: { toString: () =>'0xSolver' },
            refund_to: { toString: () =>'0xSolver' }, recipient: { toString: () => '0xUser' },
            token: { toString: () => '0xToken' },
            amount: 2000000000000000000n, timelock: 1700000000n, status: 1,
            secret: new Array(32).fill(0),
            reward: 100000000000000000n, reward_timelock: 1700001000n,
            reward_recipient: { toString: () => '0xRR' }, reward_token: { toString: () => '0xRT' },
            payout_curve: { toString: () => '0x0' },
            payout_curve_data: [0x12, 0x34],
        }, hashlock, 18, 1)
        expect(result).not.toBeNull()
        expect(result!.amount).toBe(2)
        expect(result!.reward).toBe(0.1)
        expect(result!.rewardTimelock).toBe(1700001000)
        expect(result!.payoutCurve).toBeNull()
        expect(result!.payoutCurveData).toBe('0x1234')
        expect(result!.index).toBe(1)
    })

    it('returns null when status is 0', () => {
        expect(resolveSolverLock({
            refund_to: { toString: () =>'S' }, recipient: { toString: () => 'R' },
            token: { toString: () => 'T' },
            amount: 0n, timelock: 0n, status: 0, secret: [],
            reward: 0n, reward_timelock: 0n,
            reward_recipient: { toString: () => '' }, reward_token: { toString: () => '' },
        }, hashlock, 18, 1)).toBeNull()
    })

    it('preserves an active payout curve for verification', () => {
        const result = resolveSolverLock({
            sender: { toString: () =>'0xSolver' },
            refund_to: { toString: () =>'0xSolver' }, recipient: { toString: () => '0xUser' },
            token: { toString: () => '0xToken' },
            amount: 0n, timelock: 1700000000n, status: 1, secret: [],
            reward: 0n, reward_timelock: 0n,
            reward_recipient: { toString: () => '0xRR' }, reward_token: { toString: () => '0xRT' },
            payout_curve: { toString: () => '0x1234' },
            payout_curve_data: [0xab, 0xcd],
        }, hashlock, 18, 1)
        expect(result!.payoutCurve).toBe('0x1234')
        expect(result!.payoutCurveData).toBe('0xabcd')
    })
})
