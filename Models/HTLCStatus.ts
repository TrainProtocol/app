export enum HTLCStatus {
    Initial = 'initial',
    UserLocked = 'userLocked',
    SolverLockDetected = 'solverLockDetected',
    SecretRevealed = 'secretRevealed',
    ManualClaimRequired = 'manualClaimRequired',
    RedeemCompleted = 'redeemCompleted',
    TimelockExpired = 'timelockExpired',
    Refunded = 'refunded',
}
