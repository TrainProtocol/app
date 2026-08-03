const SECRET_REVEAL_READY_STATUSES = new Set([
    'lplocked',
    'solverlocked',
    'redeeming',
])

/**
 * The reveal endpoint requires Station to have persisted the solver lock.
 * Accept `SolverLocked` as a compatibility alias used by older Station versions.
 */
export function isOrderReadyForSecretReveal(status: string | null | undefined): boolean {
    if (!status) return false
    return SECRET_REVEAL_READY_STATUSES.has(status.replace(/[\s_-]/g, '').toLowerCase())
}
