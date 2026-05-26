import { describe, it, expect } from 'vitest'
import { resolveHTLCStatus, type StatusResolverInput } from '../verification/status-resolver'
import { HTLCStatus, isTerminalStatus } from '../types/htlc-status'
import { LockStatus } from '../types/lock'
import type { UserLockDetails, SolverLockDetails } from '../types/lock'

const lockedSource: UserLockDetails = {
    sender: '0xUser', recipient: '0xRecipient', token: '0xToken',
    amount: 100, timelock: 9999999, hashlock: '0xabc',
    secret: 0n, status: LockStatus.Pending,
}

const lockedSolver: SolverLockDetails = {
    sender: '0xSolver', recipient: '0xUser', token: '0xToken',
    amount: 100, timelock: 9999999, hashlock: '0xabc',
    secret: 0n, status: LockStatus.Pending, index: 1,
}

describe('resolveHTLCStatus', () => {
    it('returns Initial when nothing is set', () => {
        expect(resolveHTLCStatus({ timelockExpired: false })).toBe(HTLCStatus.Initial)
    })

    it('returns UserLocked when source has sender', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource, timelockExpired: false,
        })).toBe(HTLCStatus.UserLocked)
    })

    it('returns SolverLockDetected when solver locked and no source secret', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource, solverLockDetails: lockedSolver, timelockExpired: false,
        })).toBe(HTLCStatus.SolverLockDetected)
    })

    it('returns SecretRevealed via secretRevealed flag', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource, solverLockDetails: lockedSolver,
            timelockExpired: false, secretRevealed: true,
        })).toBe(HTLCStatus.SecretRevealed)
    })

    it('returns SecretRevealed via sourceDetails.secret (truthy bigint)', () => {
        expect(resolveHTLCStatus({
            sourceDetails: { ...lockedSource, secret: 123n },
            solverLockDetails: lockedSolver, timelockExpired: false,
        })).toBe(HTLCStatus.SecretRevealed)
    })

    it('returns ManualClaimRequired', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource, solverLockDetails: lockedSolver,
            timelockExpired: false, secretRevealed: true, manualClaimRequired: true,
        })).toBe(HTLCStatus.ManualClaimRequired)
    })

    it('returns RedeemCompleted when solver lock is Redeemed', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource,
            solverLockDetails: { ...lockedSolver, status: LockStatus.Redeemed },
            timelockExpired: false,
        })).toBe(HTLCStatus.RedeemCompleted)
    })

    it('returns RedeemCompleted via destRedeemTxId alone', () => {
        expect(resolveHTLCStatus({
            timelockExpired: false, destRedeemTxId: '0xtx123',
        })).toBe(HTLCStatus.RedeemCompleted)
    })

    it('returns TimelockExpired when expired and user locked', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource, timelockExpired: true,
        })).toBe(HTLCStatus.TimelockExpired)
    })

    it('returns Refunded when source is refunded', () => {
        expect(resolveHTLCStatus({
            sourceDetails: { ...lockedSource, status: LockStatus.Refunded },
            timelockExpired: true,
        })).toBe(HTLCStatus.Refunded)
    })

    // Priority ordering
    it('RedeemCompleted takes precedence over Refunded', () => {
        expect(resolveHTLCStatus({
            sourceDetails: { ...lockedSource, status: LockStatus.Refunded },
            solverLockDetails: { ...lockedSolver, status: LockStatus.Redeemed },
            timelockExpired: true,
        })).toBe(HTLCStatus.RedeemCompleted)
    })

    it('RedeemCompleted takes precedence over TimelockExpired', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource,
            solverLockDetails: { ...lockedSolver, status: LockStatus.Redeemed },
            timelockExpired: true,
        })).toBe(HTLCStatus.RedeemCompleted)
    })

    it('ManualClaimRequired takes precedence over Refunded', () => {
        expect(resolveHTLCStatus({
            sourceDetails: { ...lockedSource, status: LockStatus.Refunded },
            timelockExpired: false, manualClaimRequired: true,
        })).toBe(HTLCStatus.ManualClaimRequired)
    })

    it('Refunded takes precedence over TimelockExpired', () => {
        expect(resolveHTLCStatus({
            sourceDetails: { ...lockedSource, status: LockStatus.Refunded },
            timelockExpired: true,
        })).toBe(HTLCStatus.Refunded)
    })

    // Edge cases
    it('SolverLockDetected requires sourceDetails to exist', () => {
        expect(resolveHTLCStatus({
            solverLockDetails: lockedSolver, timelockExpired: false,
        })).toBe(HTLCStatus.Initial)
    })

    it('SecretRevealed requires sourceDetails to exist', () => {
        expect(resolveHTLCStatus({
            solverLockDetails: lockedSolver, timelockExpired: false, secretRevealed: true,
        })).toBe(HTLCStatus.Initial)
    })

    it('source with truthy secret goes to SecretRevealed even with solver present', () => {
        expect(resolveHTLCStatus({
            sourceDetails: { ...lockedSource, secret: 42n },
            solverLockDetails: lockedSolver, timelockExpired: false,
        })).toBe(HTLCStatus.SecretRevealed)
    })
})

describe('isTerminalStatus', () => {
    it('RedeemCompleted is terminal', () => {
        expect(isTerminalStatus(HTLCStatus.RedeemCompleted)).toBe(true)
    })

    it('Refunded is terminal', () => {
        expect(isTerminalStatus(HTLCStatus.Refunded)).toBe(true)
    })

    it('other statuses are not terminal', () => {
        expect(isTerminalStatus(HTLCStatus.Initial)).toBe(false)
        expect(isTerminalStatus(HTLCStatus.UserLocked)).toBe(false)
        expect(isTerminalStatus(HTLCStatus.SolverLockDetected)).toBe(false)
        expect(isTerminalStatus(HTLCStatus.SecretRevealed)).toBe(false)
        expect(isTerminalStatus(HTLCStatus.TimelockExpired)).toBe(false)
    })

    it('undefined returns false', () => {
        expect(isTerminalStatus(undefined)).toBe(false)
    })
})
