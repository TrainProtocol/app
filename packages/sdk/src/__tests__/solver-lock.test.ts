import { describe, it, expect } from 'vitest'
import { verifySolverLock, type VerifySolverLockParams } from '../verification/solver-lock'
import type { SolverLockDetails } from '../types/lock'
import { LockStatus } from '../types/lock'

const baseLock: SolverLockDetails = {
    sender: '0xSolverAddress',
    recipient: '0xUserAddress',
    token: '0xTokenAddress',
    amount: 100,
    amountInBaseUnits: 100n,
    timelock: 9999999,
    hashlock: '0xabc',
    secret: 0n,
    status: LockStatus.Pending,
    index: 1,
    payoutCurve: '0xCurve',
    payoutCurveData: '0x1234',
}

const baseParams: VerifySolverLockParams = {
    solverLockDetails: baseLock,
    expectedReceiveAmount: 100,
    expectedRecipient: '0xUserAddress',
    expectedToken: '0xTokenAddress',
    expectedPayoutCurve: '0xCurve',
    nowInSeconds: 1_000,
}

describe('verifySolverLock', () => {
    it('passes when all fields match', () => {
        const result = verifySolverLock(baseParams)
        expect(result.verified).toBe(true)
        expect(result.skipped).toBe(false)
        expect(result.mismatches).toEqual([])
    })

    it('detects amount mismatch', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, amount: 99 },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches).toHaveLength(1)
        expect(result.mismatches[0]).toContain('Amount')
    })

    it('detects an exact base-unit mismatch hidden by the formatted amount', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedReceiveAmountInBaseUnits: 100_000_000_000_000_001n,
            solverLockDetails: {
                ...baseLock,
                amount: 0.1,
                amountInBaseUnits: 100_000_000_000_000_000n,
            },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches[0]).toContain('base units')
    })

    it('rejects exact verification when raw on-chain amount is unavailable', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedReceiveAmountInBaseUnits: 100n,
            solverLockDetails: { ...baseLock, amountInBaseUnits: undefined },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches[0]).toContain('unavailable')
    })

    it('detects when solver amount exceeds expected (exact match)', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, amount: 101 },
        })
        expect(result.verified).toBe(false)
    })

    it('compares recipient case-insensitively', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedRecipient: '0xAABBCC',
            solverLockDetails: { ...baseLock, recipient: '0xaabbcc' },
        })
        expect(result.verified).toBe(true)
    })

    it('treats hex addresses with different leading-zero padding as equal', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedRecipient: '0x04e4787821c95f1d4d00314b6bb1ad60b413e537403fac20e218865f1e4ca1cc',
            solverLockDetails: {
                ...baseLock,
                recipient: '0x4e4787821c95f1d4d00314b6bb1ad60b413e537403fac20e218865f1e4ca1cc',
            },
        })
        expect(result.verified).toBe(true)
    })

    it('detects recipient mismatch', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, recipient: '0xWrongAddress' },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches[0]).toContain('Recipient')
    })

    it('skips recipient check when expectedRecipient is empty', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedRecipient: '',
        })
        expect(result.verified).toBe(true)
    })

    it('compares token case-insensitively', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedToken: '0xDDEEFF',
            solverLockDetails: { ...baseLock, token: '0xddeeff' },
        })
        expect(result.verified).toBe(true)
    })

    it('detects token mismatch', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, token: '0xWrongToken' },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches[0]).toContain('Token')
    })

    it('skips token check when expectedToken is null', () => {
        expect(verifySolverLock({ ...baseParams, expectedToken: null }).verified).toBe(true)
    })

    it('skips token check when expectedToken is undefined', () => {
        expect(verifySolverLock({ ...baseParams, expectedToken: undefined }).verified).toBe(true)
    })

    it('returns verified=false when sender is falsy', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, sender: '' },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches).toEqual([])
    })

    it('accumulates multiple mismatches', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, amount: 50, recipient: '0xWrong', token: '0xBad' },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches).toHaveLength(3)
    })

    it('treats non-hex addresses as case-sensitive', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedRecipient: 'AbC123',
            solverLockDetails: { ...baseLock, recipient: 'abc123' },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches[0]).toContain('Recipient')
    })

    it('rejects a non-pending lock', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, status: LockStatus.Redeemed },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches[0]).toContain('Status')
    })

    it('rejects a non-positive solver lock index', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, index: 0 },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches[0]).toContain('Index')
    })

    it('verifies the expected solver sender', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedSender: '0x112233',
            solverLockDetails: { ...baseLock, sender: '0x445566' },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches[0]).toContain('Sender')
    })

    it('accepts the destination chain’s recognized payout curve', () => {
        expect(verifySolverLock(baseParams).verified).toBe(true)
    })

    it('accepts a lock with no payout curve at all', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, payoutCurve: null },
        })
        expect(result.verified).toBe(true)
    })

    it('accepts a lock with no payout curve even when the chain has no known curve', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedPayoutCurve: undefined,
            solverLockDetails: { ...baseLock, payoutCurve: null },
        })
        expect(result.verified).toBe(true)
    })

    it('rejects an unrecognized payout curve', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, payoutCurve: '0xOtherCurve' },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches.some(m => m.includes('Payout curve'))).toBe(true)
    })

    it('ignores the curve config, which both accepted shapes leave unused', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, payoutCurveData: '0x5678' },
        })
        expect(result.verified).toBe(true)
    })

    it('fails closed when the solver payout policy is unavailable', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, payoutCurve: undefined as never },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches.some(m => m.includes('Payout curve'))).toBe(true)
    })

    it('fails closed on a curve the destination chain cannot vouch for', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedPayoutCurve: undefined,
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches.some(m => m.includes('no recognized full-payout curve'))).toBe(true)
    })

    it('matches a recognized curve across hex casing and zero padding', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedPayoutCurve: '0xFF9d783c6cB8294a4fa4d1556752c3EAF3E20DEE',
            solverLockDetails: { ...baseLock, payoutCurve: '0xff9d783c6cb8294a4fa4d1556752c3eaf3e20dee' },
        })
        expect(result.verified).toBe(true)
    })

    it('rejects an expired destination lock', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedSourceTimelock: 10_000,
            nowInSeconds: 9_000,
            solverLockDetails: { ...baseLock, timelock: 8_999 },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches.some(m => m.includes('expired'))).toBe(true)
    })

    it('fails closed when the destination timelock is invalid', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, timelock: Number.NaN },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches.some(m => m.includes('expiry is invalid'))).toBe(true)
    })

    it('rejects a destination timelock without the source safety margin', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedSourceTimelock: 10_000,
            minimumTimelockSafetyMarginSeconds: 600,
            nowInSeconds: 1_000,
            solverLockDetails: { ...baseLock, timelock: 9_500 },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches.some(m => m.includes('safety margin'))).toBe(true)
    })

    it('rejects a destination lock with too little lifetime remaining', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedSourceTimelock: 2_000,
            minimumDestinationLockLifetimeSeconds: 300,
            nowInSeconds: 1_000,
            solverLockDetails: { ...baseLock, timelock: 1_299 },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches.some(m => m.includes('300s remaining'))).toBe(true)
    })

    it('accepts a destination lock at the minimum remaining lifetime', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedSourceTimelock: 2_000,
            minimumDestinationLockLifetimeSeconds: 300,
            nowInSeconds: 1_000,
            solverLockDetails: { ...baseLock, timelock: 1_300 },
        })
        expect(result.verified).toBe(true)
    })

    it('accepts a live destination timelock with the required safety margin', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedSourceTimelock: 10_000,
            minimumTimelockSafetyMarginSeconds: 600,
            nowInSeconds: 1_000,
            solverLockDetails: { ...baseLock, timelock: 9_400 },
        })
        expect(result.verified).toBe(true)
    })
})
