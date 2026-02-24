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

export const TERMINAL_STATUSES = new Set<HTLCStatus>([
    HTLCStatus.RedeemCompleted,
    HTLCStatus.Refunded,
])

export function isTerminalStatus(status: HTLCStatus | undefined): boolean {
    return !!status && TERMINAL_STATUSES.has(status)
}
