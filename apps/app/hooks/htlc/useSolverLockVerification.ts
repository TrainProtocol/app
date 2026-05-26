import { useSolverLockVerification as useSolverLockVerificationBase } from '@train-protocol/react'
import { useSwapStore } from '@/stores/swapStore'

export type { VerificationResult } from '@train-protocol/react'

/**
 * App-level wrapper that reads the active hashlock from swapStore
 * and delegates to the react package's useSolverLockVerification.
 */
export function useSolverLockVerification() {
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    return useSolverLockVerificationBase(activeHashlock)
}
