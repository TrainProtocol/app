import { LockDetails, LockStatus } from '../types/lock'
import { HTLCStatus } from '../types/htlc-status'

export interface StatusResolverInput {
    sourceDetails?: LockDetails
    solverLockDetails?: LockDetails
    timelockExpired: boolean
    secretRevealed?: boolean
    manualClaimRequired?: boolean
}

export function resolveHTLCStatus(input: StatusResolverInput): HTLCStatus {
    const { sourceDetails, solverLockDetails, timelockExpired, secretRevealed, manualClaimRequired } = input

    const userLocked = !!sourceDetails?.sender
    const solverLocked = !!solverLockDetails?.sender
    const redeemCompleted = solverLockDetails?.status === LockStatus.Redeemed
    const refunded = sourceDetails?.status === LockStatus.Refunded

    if (redeemCompleted) return HTLCStatus.RedeemCompleted
    else if (manualClaimRequired) return HTLCStatus.ManualClaimRequired
    else if (refunded) return HTLCStatus.Refunded
    else if (timelockExpired && !redeemCompleted) return HTLCStatus.TimelockExpired
    else if (secretRevealed || sourceDetails?.secret) return HTLCStatus.SecretRevealed
    else if (solverLocked && !sourceDetails?.secret) return HTLCStatus.SolverLockDetected
    else if (userLocked) return HTLCStatus.UserLocked
    else return HTLCStatus.Initial
}
