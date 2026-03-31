import { describe, it, expect } from 'vitest'
import { resolveHTLCStatus, type StatusResolverInput } from '../verification/status-resolver'
import { HTLCStatus } from '../types/htlc-status'
import { LockStatus, type LockDetails } from '../types/lock'

const lockedSource: LockDetails = {
    sender: '0xUser',
    amount: 100,
    timelock: 9999999,
    hashlock: '0xabc',
    secret: undefined,
    status: LockStatus.Pending,
}

const lockedSolver: LockDetails = {
    sender: '0xSolver',
    amount: 100,
    timelock: 9999999,
    hashlock: '0xabc',
    secret: undefined,
    status: LockStatus.Pending,
}

describe('resolveHTLCStatus', () => {
    // --- Every status reachable ---

    it('returns Initial when nothing is set', () => {
        expect(resolveHTLCStatus({ timelockExpired: false })).toBe(HTLCStatus.Initial)
    })

    it('returns UserLocked when source has sender', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource,
            timelockExpired: false,
        })).toBe(HTLCStatus.UserLocked)
    })

    it('returns SolverLockDetected when solver locked and no source secret', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource,
            solverLockDetails: lockedSolver,
            timelockExpired: false,
        })).toBe(HTLCStatus.SolverLockDetected)
    })

    it('returns SecretRevealed via secretRevealed flag', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource,
            solverLockDetails: lockedSolver,
            timelockExpired: false,
            secretRevealed: true,
        })).toBe(HTLCStatus.SecretRevealed)
    })

    it('returns SecretRevealed via sourceDetails.secret', () => {
        expect(resolveHTLCStatus({
            sourceDetails: { ...lockedSource, secret: 123n },
            solverLockDetails: lockedSolver,
            timelockExpired: false,
        })).toBe(HTLCStatus.SecretRevealed)
    })

    it('returns ManualClaimRequired', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource,
            solverLockDetails: lockedSolver,
            timelockExpired: false,
            secretRevealed: true,
            manualClaimRequired: true,
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
            timelockExpired: false,
            destRedeemTxId: '0xtx123',
        })).toBe(HTLCStatus.RedeemCompleted)
    })

    it('returns TimelockExpired when expired and not redeemed', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource,
            timelockExpired: true,
        })).toBe(HTLCStatus.TimelockExpired)
    })

    it('returns Refunded when source is refunded', () => {
        expect(resolveHTLCStatus({
            sourceDetails: { ...lockedSource, status: LockStatus.Refunded },
            timelockExpired: true,
        })).toBe(HTLCStatus.Refunded)
    })

    // --- Priority ordering ---

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

    it('RedeemCompleted takes precedence over ManualClaimRequired', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource,
            solverLockDetails: { ...lockedSolver, status: LockStatus.Redeemed },
            timelockExpired: false,
            manualClaimRequired: true,
        })).toBe(HTLCStatus.RedeemCompleted)
    })

    it('ManualClaimRequired takes precedence over Refunded', () => {
        expect(resolveHTLCStatus({
            sourceDetails: { ...lockedSource, status: LockStatus.Refunded },
            timelockExpired: false,
            manualClaimRequired: true,
        })).toBe(HTLCStatus.ManualClaimRequired)
    })

    it('Refunded takes precedence over TimelockExpired', () => {
        expect(resolveHTLCStatus({
            sourceDetails: { ...lockedSource, status: LockStatus.Refunded },
            timelockExpired: true,
        })).toBe(HTLCStatus.Refunded)
    })

    // --- Edge cases ---

    it('SolverLockDetected requires sourceDetails to exist', () => {
        // solver locked but no sourceDetails → stays Initial (not SolverLockDetected)
        expect(resolveHTLCStatus({
            solverLockDetails: lockedSolver,
            timelockExpired: false,
        })).toBe(HTLCStatus.Initial)
    })

    it('SecretRevealed requires sourceDetails to exist', () => {
        expect(resolveHTLCStatus({
            solverLockDetails: lockedSolver,
            timelockExpired: false,
            secretRevealed: true,
        })).toBe(HTLCStatus.Initial)
    })

    it('SolverLockDetected skipped when source has secret (goes to SecretRevealed)', () => {
        expect(resolveHTLCStatus({
            sourceDetails: { ...lockedSource, secret: 42n },
            solverLockDetails: lockedSolver,
            timelockExpired: false,
        })).toBe(HTLCStatus.SecretRevealed)
    })

    it('TimelockExpired not reached when already redeemed', () => {
        expect(resolveHTLCStatus({
            sourceDetails: lockedSource,
            solverLockDetails: { ...lockedSolver, status: LockStatus.Redeemed },
            timelockExpired: true,
        })).toBe(HTLCStatus.RedeemCompleted)
    })
})
