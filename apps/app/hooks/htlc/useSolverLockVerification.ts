import { useMemo } from 'react'
import { useActiveSwap } from '@/hooks/useActiveSwap'
import { verifySolverLock, VerificationResult } from '@train-protocol/sdk'
import { formatUnits } from 'viem'
import { Address } from '@/lib/address'

export type { VerificationResult }

export function useSolverLockVerification(): VerificationResult {
    const { destinationAddress, destinationToken, destinationNetwork, solverLockDetails, sourceDetails, hashlock } = useActiveSwap()
    const normalizedAddress = useMemo(() => (destinationAddress && destinationNetwork) ? new Address(destinationAddress, destinationNetwork).normalized : '', [destinationAddress, destinationNetwork])
    const normalizedToken = useMemo(() => (destinationToken?.contractAddress && destinationNetwork) ? new Address(destinationToken.contractAddress, destinationNetwork).normalized : '', [destinationToken, destinationNetwork])


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
        const decimals = destinationToken?.decimals ?? 18
        const formattedExpected = Number(formatUnits(BigInt(sourceDetails.dstAmount), decimals))

        return verifySolverLock({
            solverLockDetails,
            expectedReceiveAmount: formattedExpected,
            expectedRecipient: normalizedAddress,
            expectedToken: normalizedToken,
        })
    }, [solverLockDetails, sourceDetails, destinationAddress, destinationToken])
}
