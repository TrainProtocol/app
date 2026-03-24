import { useMemo } from 'react'
import { useSwapData } from '@/hooks/useSwapData'
import { useActiveSwapState } from '@/hooks/useActiveSwapState'
import { verifySolverLock, VerificationResult } from '@train-protocol/sdk'
import { formatUnits } from 'viem'

export type { VerificationResult }

export function useSolverLockVerification(): VerificationResult {
    const { address, destination_asset } = useSwapData()
    const { solverLockDetails, sourceDetails } = useActiveSwapState()
    return useMemo(() => {
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
        const decimals = destination_asset?.decimals ?? 18
        const formattedExpected = Number(formatUnits(BigInt(sourceDetails.dstAmount), decimals))

        return verifySolverLock({
            solverLockDetails,
            expectedReceiveAmount: formattedExpected,
            expectedRecipient: address ?? '',
            expectedToken: destination_asset?.contractAddress,
        })
    }, [solverLockDetails, sourceDetails, address, destination_asset])
}
