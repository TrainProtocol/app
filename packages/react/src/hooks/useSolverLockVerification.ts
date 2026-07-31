import { useMemo } from 'react'
import { verifySolverLock, formatUnits } from '@train-protocol/sdk'
import type { VerificationResult } from '@train-protocol/sdk'
import { useStoreContext } from '../providers/TrainProvider'
import { useDerivedSwapState } from '../internal/useDerivedSwapState'
import { MINIMUM_DESTINATION_LOCK_LIFETIME_SECONDS } from '../internal/timing'

export type { VerificationResult }

export interface UseSolverLockVerificationResult extends VerificationResult {}

/**
 * Read-only hook that verifies the solver's on-chain lock matches the expected swap parameters.
 *
 * Checks:
 * - Exact base-unit amount: solver lock matches the quoted receive amount
 * - Sender: lock belongs to the quoted destination solver
 * - Recipient: lock recipient matches the user's destination address
 * - Token: locked token matches the expected destination token
 * - State/index: lock is pending and has a positive solver-lock index
 * - Payout policy: lock carries no curve, or the destination chain's recognized full-payout curve
 * - Timelocks: destination retains the claim fallback window and source safety margin
 *
 * @param hashlock - The hashlock of the swap to verify
 * @returns Verification result with `verified`, `skipped`, and `mismatches` fields
 */
export function useSolverLockVerification(hashlock: string | null | undefined): UseSolverLockVerificationResult {
    const hl = hashlock ?? null
    const store = useStoreContext()
    const derived = useDerivedSwapState(store, hl)

    return useMemo(() => {
        const {
            solverLockDetails,
            sourceDetails,
            destinationAddress,
            destinationSolverAddress,
            destinationNetwork,
            destinationToken,
        } = derived

        if (!solverLockDetails?.sender) {
            return { verified: false, skipped: false, mismatches: [] }
        }

        // Every field below binds the observed lock to the accepted quote. If recovery
        // metadata is incomplete, blocking reveal is safer than guessing.
        if (
            !sourceDetails?.dstAmount ||
            !sourceDetails.timelock ||
            !destinationAddress ||
            !destinationSolverAddress ||
            !destinationToken?.contract
        ) {
            return { verified: false, skipped: true, mismatches: [] }
        }

        // Keep the formatted value for backwards-compatible SDK callers, while the
        // irreversible check below uses exact base units.
        const decimals = destinationToken?.decimals ?? 18
        const formattedExpected = Number(formatUnits(BigInt(sourceDetails.dstAmount), decimals))

        return verifySolverLock({
            solverLockDetails,
            expectedReceiveAmount: formattedExpected,
            expectedReceiveAmountInBaseUnits: BigInt(sourceDetails.dstAmount),
            expectedRecipient: destinationAddress,
            expectedToken: destinationToken.contract,
            expectedSender: destinationSolverAddress,
            expectedPayoutCurve: destinationNetwork?.constantPayoutCurveContract,
            expectedSourceTimelock: sourceDetails.timelock,
            minimumDestinationLockLifetimeSeconds: MINIMUM_DESTINATION_LOCK_LIFETIME_SECONDS,
        })
    }, [
        derived.solverLockDetails,
        derived.sourceDetails,
        derived.destinationAddress,
        derived.destinationSolverAddress,
        derived.destinationNetwork,
        derived.destinationToken,
    ])
}
