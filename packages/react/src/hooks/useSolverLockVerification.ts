import { useMemo } from 'react'
import type { VerificationResult } from '@train-protocol/sdk'
import { useStoreContext } from '../providers/TrainProvider'
import { useDerivedSwapState } from '../internal/useDerivedSwapState'
import { resolveSolverLockVerification } from '../internal/resolveSolverLockVerification'

export type { VerificationResult }

export interface UseSolverLockVerificationResult extends VerificationResult {}

/**
 * Read-only hook that verifies the solver's on-chain lock matches the expected swap parameters.
 *
 * Checks:
 * - Exact base-unit amount: solver lock matches the quoted receive amount
 * - Sender: lock belongs to the quoted destination solver — the address it is keyed by
 * - Recipient: lock recipient matches the user's destination address
 * - Token: locked token matches the expected destination token
 * - State: lock is pending
 * - Payout policy: lock carries no curve, or the destination chain's recognized full-payout curve
 * - Timelocks: destination retains the claim fallback window and source safety margin
 *
 * `useRevealSecret` re-runs the same verdict before sending the secret, so this hook is for
 * display only — it is not the gate.
 *
 * @param hashlock - The hashlock of the swap to verify
 * @returns Verification result with `verified`, `skipped`, and `mismatches` fields
 */
export function useSolverLockVerification(hashlock: string | null | undefined): UseSolverLockVerificationResult {
    const hl = hashlock ?? null
    const store = useStoreContext()
    const derived = useDerivedSwapState(store, hl)

    return useMemo(() => resolveSolverLockVerification(derived), [
        derived.solverLockDetails,
        derived.sourceDetails,
        derived.destinationAddress,
        derived.destinationSolverAddress,
        derived.destinationNetwork,
        derived.destinationToken,
    ])
}
