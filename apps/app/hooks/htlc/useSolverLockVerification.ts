import { useMemo } from 'react'
import { useSwapData } from '@/hooks/useSwapData'
import { useActiveSwapState } from '@/hooks/useActiveSwapState'
import { verifySolverLock, VerificationResult } from '@train-protocol/sdk'
import { formatUnits } from 'viem'
import { Address } from '@/lib/address'

export type { VerificationResult }

export function useSolverLockVerification(): VerificationResult {
    const { address, destination_asset, destination_network } = useSwapData()
    const { solverLockDetails, sourceDetails, hashlock } = useActiveSwapState()
    const normalizedAddress = useMemo(() => (address && destination_network) ? new Address(address, destination_network).normalized : '', [address, destination_network])
    const normalizedToken = useMemo(() => (destination_asset?.contractAddress && destination_network) ? new Address(destination_asset.contractAddress, destination_network).normalized : '', [destination_asset, destination_network])


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
            expectedRecipient: normalizedAddress,
            expectedToken: normalizedToken,
        })
    }, [solverLockDetails, sourceDetails, address, destination_asset])
}
