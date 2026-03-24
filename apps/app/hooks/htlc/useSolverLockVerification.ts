import { useMemo } from 'react'
import { useSwapData } from '@/hooks/useSwapData'
import { useActiveSwapState } from '@/hooks/useActiveSwapState'
import { useSwap } from '@train-protocol/react'
import { useSwapStore } from '@/stores/swapStore'
import { verifySolverLock, VerificationResult } from '@train-protocol/sdk'
import { formatUnits } from 'viem'

export type { VerificationResult }

export function useSolverLockVerification(): VerificationResult {
    const { address, destination_asset } = useSwapData()
    const { solverLockDetails } = useActiveSwapState()
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const swap = useSwap(activeHashlock)

    return useMemo(() => {
        if (!solverLockDetails?.sender) {
            return { verified: false, skipped: false, mismatches: [] }
        }

        // No expected values (recovered swap) — skip verification
        if (!swap?.receiveAmount) {
            return { verified: false, skipped: true, mismatches: [] }
        }

        // receiveAmount from the quote is in raw units (wei).
        // solverLockDetails.amount from the chain client is formatted (human-readable).
        // Convert to the same unit for comparison.
        const decimals = destination_asset?.decimals ?? 18
        const formattedExpected = Number(formatUnits(BigInt(swap.receiveAmount), decimals))

        return verifySolverLock({
            solverLockDetails,
            expectedReceiveAmount: formattedExpected,
            expectedRecipient: address ?? '',
            expectedToken: destination_asset?.contractAddress,
        })
    }, [solverLockDetails, swap, address, destination_asset])
}
