import { describe, it, expect } from 'vitest'
import { verifySolverLock, type VerifySolverLockParams } from '../verification/solver-lock'
import type { LockDetails } from '../types/lock'

const baseLock: LockDetails = {
    sender: '0xSolverAddress',
    recipient: '0xUserAddress',
    token: '0xTokenAddress',
    amount: 100,
    timelock: 9999999,
    hashlock: '0xabc',
    secret: undefined,
}

const baseParams: VerifySolverLockParams = {
    solverLockDetails: baseLock,
    expectedReceiveAmount: 100,
    expectedRecipient: '0xUserAddress',
    expectedToken: '0xTokenAddress',
}

describe('verifySolverLock', () => {
    it('passes when all fields match', () => {
        const result = verifySolverLock(baseParams)
        expect(result.verified).toBe(true)
        expect(result.skipped).toBe(false)
        expect(result.mismatches).toEqual([])
    })

    // --- Amount checks ---

    it('detects amount mismatch', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, amount: 99 },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches).toHaveLength(1)
        expect(result.mismatches[0]).toContain('Amount')
    })

    it('detects when solver amount exceeds expected (exact match, not >=)', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, amount: 101 },
        })
        // Current implementation uses exact match — this documents the behavior
        expect(result.verified).toBe(false)
        expect(result.mismatches[0]).toContain('Amount')
    })

    it('passes when amount is zero and expected is zero', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedReceiveAmount: 0,
            solverLockDetails: { ...baseLock, amount: 0 },
        })
        expect(result.verified).toBe(true)
    })

    // --- Recipient checks ---

    it('compares recipient case-insensitively', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedRecipient: '0xUSERADDRESS',
            solverLockDetails: { ...baseLock, recipient: '0xuseraddress' },
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

    it('skips recipient check when expectedRecipient is empty string', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedRecipient: '',
        })
        expect(result.verified).toBe(true)
    })

    it('skips recipient check when lock recipient is undefined', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, recipient: undefined },
        })
        expect(result.verified).toBe(true)
    })

    // --- Token checks ---

    it('compares token case-insensitively', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedToken: '0xTOKENADDRESS',
            solverLockDetails: { ...baseLock, token: '0xtokenaddress' },
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
        const result = verifySolverLock({
            ...baseParams,
            expectedToken: null,
        })
        expect(result.verified).toBe(true)
    })

    it('skips token check when expectedToken is undefined', () => {
        const result = verifySolverLock({
            ...baseParams,
            expectedToken: undefined,
        })
        expect(result.verified).toBe(true)
    })

    it('skips token check when lock token is undefined', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, token: undefined },
        })
        expect(result.verified).toBe(true)
    })

    // --- Sender / null checks ---

    it('returns verified=false when sender is null', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, sender: undefined },
        })
        expect(result.verified).toBe(false)
        expect(result.skipped).toBe(false)
        expect(result.mismatches).toEqual([])
    })

    it('returns verified=false when sender is empty string', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, sender: '' },
        })
        expect(result.verified).toBe(false)
    })

    // --- Multiple mismatches ---

    it('accumulates multiple mismatches', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: {
                ...baseLock,
                amount: 50,
                recipient: '0xWrong',
                token: '0xBadToken',
            },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches).toHaveLength(3)
    })
})
