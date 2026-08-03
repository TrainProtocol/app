import { verifySolverLock, formatUnits } from '@train-protocol/sdk'
import type { Network, SolverLockDetails, Token, UserLockDetails, VerificationResult } from '@train-protocol/sdk'
import { MINIMUM_DESTINATION_LOCK_LIFETIME_SECONDS } from './timing'

export interface SolverLockVerificationInput {
    solverLockDetails: SolverLockDetails | null | undefined
    sourceDetails: UserLockDetails | null | undefined
    destinationAddress: string | null | undefined
    destinationSolverAddress: string | null | undefined
    destinationNetwork: Network | null | undefined
    destinationToken: Token | null | undefined
}

/**
 * The single solver-lock verdict, shared by the UI hook and the reveal action so an
 * irreversible reveal can never run against a verdict different from the one displayed.
 */
export function resolveSolverLockVerification(input: SolverLockVerificationInput): VerificationResult {
    const {
        solverLockDetails,
        sourceDetails,
        destinationAddress,
        destinationSolverAddress,
        destinationNetwork,
        destinationToken,
    } = input

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
    const decimals = destinationToken.decimals ?? 18

    return verifySolverLock({
        solverLockDetails,
        expectedReceiveAmount: Number(formatUnits(BigInt(sourceDetails.dstAmount), decimals)),
        expectedReceiveAmountInBaseUnits: BigInt(sourceDetails.dstAmount),
        expectedRecipient: destinationAddress,
        expectedToken: destinationToken.contract,
        expectedSender: destinationSolverAddress,
        expectedPayoutCurve: destinationNetwork?.constantPayoutCurveContract,
        expectedSourceTimelock: sourceDetails.timelock,
        minimumDestinationLockLifetimeSeconds: MINIMUM_DESTINATION_LOCK_LIFETIME_SECONDS,
    })
}
