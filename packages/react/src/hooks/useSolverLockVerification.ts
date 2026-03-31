import { useMemo } from 'react'
import { verifySolverLock, formatUnits } from '@train-protocol/sdk'
import type { VerificationResult } from '@train-protocol/sdk'
import { useStoreContext } from '../providers/TrainProvider'
import { useDerivedSwapState } from '../internal/useDerivedSwapState'

export type { VerificationResult }

export interface UseSolverLockVerificationResult extends VerificationResult {}

/**
 * Read-only hook that verifies the solver's on-chain lock matches the expected swap parameters.
 *
 * Checks:
 * - Amount: solver locked amount matches the expected receive amount
 * - Recipient: lock recipient matches the user's destination address
 * - Token: locked token matches the expected destination token
 *
 * @param hashlock - The hashlock of the swap to verify
 * @returns Verification result with `verified`, `skipped`, and `mismatches` fields
 */
export function useSolverLockVerification(hashlock: string | null | undefined): UseSolverLockVerificationResult {
    const hl = hashlock ?? null
    const store = useStoreContext()
    const derived = useDerivedSwapState(store, hl)

    return useMemo(() => {
        const { solverLockDetails, sourceDetails, destinationAddress, destinationToken } = derived

        if (!solverLockDetails?.sender) {
            return { verified: false, skipped: false, mismatches: [] }
        }

        // No on-chain dstAmount available — skip verification
        if (!sourceDetails?.dstAmount) {
            return { verified: false, skipped: true, mismatches: [] }
        }

        // dstAmount from the UserLocked event is in raw units (wei).
        // solverLockDetails.amount from the chain client is formatted (human-readable).
        // Convert to the same unit for comparison.
        const decimals = destinationToken?.decimals ?? 18
        const formattedExpected = Number(formatUnits(BigInt(sourceDetails.dstAmount), decimals))

        return verifySolverLock({
            solverLockDetails,
            expectedReceiveAmount: formattedExpected,
            expectedRecipient: destinationAddress ?? '',
            expectedToken: destinationToken?.contractAddress ?? null,
        })
    }, [derived.solverLockDetails, derived.sourceDetails, derived.destinationAddress, derived.destinationToken])
}
