import { useMemo } from 'react'
import { useSwapData } from '@/hooks/useSwapData'
import { useSwapState, useCurrentSwap } from '@train-protocol/react'
import { verifySolverLock, VerificationResult } from '@train-protocol/sdk'

export type { VerificationResult }

export function useSolverLockVerification(): VerificationResult {
    const { address, destination_asset } = useSwapData()
    const { solverLockDetails } = useSwapState()
    const swap = useCurrentSwap()

    return useMemo(() => {
        if (!solverLockDetails?.sender) {
            return { verified: false, skipped: false, mismatches: [] }
        }

        // No expected values (recovered swap) — skip verification
        if (!swap?.receiveAmount) {
            return { verified: false, skipped: true, mismatches: [] }
        }

        return verifySolverLock({
            solverLockDetails,
            expectedReceiveAmount: Number(swap.receiveAmount),
            expectedRecipient: address ?? '',
            expectedToken: destination_asset?.contractAddress,
        })
    }, [solverLockDetails, swap, address, destination_asset])
}
