import { useMemo } from 'react'
import { useAtomicState } from '@/context/atomicContext'
import { useSwapStore } from '@/stores/swapStore'
import { useShallow } from 'zustand/react/shallow'
import { verifySolverLock, VerificationResult } from '@train-protocol/sdk'

export type { VerificationResult }

export function useSolverLockVerification(): VerificationResult {
    const { solverLockDetails, address, destination_asset, hashlock } = useAtomicState()

    const swap = useSwapStore(
        useShallow(s => hashlock ? s.swaps[hashlock] ?? null : null)
    )

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
