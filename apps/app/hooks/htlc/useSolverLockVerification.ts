import { useMemo } from 'react'
import { useAtomicState } from '@/context/atomicContext'
import { useSwapStore } from '@/stores/swapStore'
import { useShallow } from 'zustand/react/shallow'
import { verifySolverLock, VerificationResult } from '@train-protocol/sdk'
import { Address } from '@/lib/address'

export type { VerificationResult }

export function useSolverLockVerification(): VerificationResult {
    const { solverLockDetails, address, destination_asset, hashlock, destination_network } = useAtomicState()
    const normalizedAddress = useMemo(() => (address && destination_network) ? new Address(address, destination_network).normalized : '', [address, destination_network])
    const normalizedToken = useMemo(() => (destination_asset?.contract && destination_network) ? new Address(destination_asset.contract, destination_network).normalized : '', [destination_asset, destination_network])

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
            expectedRecipient: normalizedAddress,
            expectedToken: normalizedToken,
        })
    }, [solverLockDetails, swap, address, destination_asset])
}
