import { describe, it, expect } from 'vitest'
import { verifySolverLock, type VerifySolverLockParams } from '../verification/solver-lock'
import type { SolverLockDetails } from '../types/lock'
import { LockStatus } from '../types/lock'

const baseLock: SolverLockDetails = {
    sender: '0xSolverAddress',
    recipient: '0xUserAddress',
    token: '0xTokenAddress',
    amount: 100,
    timelock: 9999999,
    hashlock: '0xabc',
    secret: 0n,
    status: LockStatus.Pending,
    index: 1,
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

    it('detects amount mismatch', () => {
        const result = verifySolverLock({
            ...baseParams,
            solverLockDetails: { ...baseLock, amount: 99 },
        })
        expect(result.verified).toBe(false)
        expect(result.mismatches).toHaveLength(1)
        expect(result.mismatches[0]).toContain('Amount')
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
})
