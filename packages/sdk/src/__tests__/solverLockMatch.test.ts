import { describe, expect, it } from 'vitest'
import { solverLockDetailsMatch, solverLockTermsMatch, type SolverLockDetails } from '../index'
import { LockStatus } from '../types/lock'

const lock: SolverLockDetails = {
    hashlock: '0xABC',
    sender: '0xsolver',
    recipient: '0xuser',
    token: '0xtoken',
    amount: 1,
    amountInBaseUnits: 1_000_000_000_000_000_000n,
    secret: 0n,
    timelock: 10_000,
    status: LockStatus.Pending,
    payoutCurve: 'curve',
    payoutCurveData: '0x1234',
}

describe('solverLockTermsMatch', () => {
    it('accepts two identical readings', () => {
        expect(solverLockTermsMatch(lock, { ...lock })).toBe(true)
    })

    it('compares the hashlock case-insensitively', () => {
        expect(solverLockTermsMatch(lock, { ...lock, hashlock: '0xabc' })).toBe(true)
    })

    // Each of these is a field a lying node could use to make a worthless lock
    // look like the quoted one.
    it.each([
        ['amount', { amountInBaseUnits: 1n }],
        ['sender', { sender: '0xotherSolver' }],
        ['recipient', { recipient: '0xattacker' }],
        ['token', { token: '0xotherToken' }],
        ['refundTo', { refundTo: '0xattacker' }],
        ['timelock', { timelock: 9_000 }],
        ['payoutCurve', { payoutCurve: 'otherCurve' }],
        ['payoutCurveData', { payoutCurveData: '0xdead' }],
    ] as const)('rejects a disagreement about %s', (_field, override) => {
        expect(solverLockTermsMatch(lock, { ...lock, ...override })).toBe(false)
    })

    it('ignores status, which legitimately advances over the lock lifetime', () => {
        expect(solverLockTermsMatch(lock, { ...lock, status: LockStatus.Redeemed })).toBe(true)
    })

    it('ignores the secret, which appears only once the solver redeems', () => {
        expect(solverLockTermsMatch(lock, { ...lock, secret: 42n })).toBe(true)
    })

    it('falls back to the formatted amount when neither side carries base units', () => {
        const a = { ...lock, amountInBaseUnits: undefined }
        expect(solverLockTermsMatch(a, { ...a })).toBe(true)
        expect(solverLockTermsMatch(a, { ...a, amount: 2 })).toBe(false)
    })

    it('rejects when only one side carries base units — the readings are not comparable', () => {
        expect(solverLockTermsMatch(lock, { ...lock, amountInBaseUnits: undefined })).toBe(false)
    })
})

describe('solverLockDetailsMatch', () => {
    it('accepts two identical readings', () => {
        expect(solverLockDetailsMatch(lock, { ...lock })).toBe(true)
    })

    it('rejects a status disagreement, unlike the terms-only comparison', () => {
        const redeemed = { ...lock, status: LockStatus.Redeemed }
        expect(solverLockTermsMatch(lock, redeemed)).toBe(true)
        expect(solverLockDetailsMatch(lock, redeemed)).toBe(false)
    })

    it('rejects a terms disagreement', () => {
        expect(solverLockDetailsMatch(lock, { ...lock, amountInBaseUnits: 1n })).toBe(false)
    })
})
