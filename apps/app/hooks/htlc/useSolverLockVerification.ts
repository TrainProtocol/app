import { useMemo } from 'react'
import { useAtomicState } from '@/apps/app/context/atomicContext'
import { useSwapStore } from '@/apps/app/stores/swapStore'
import { useShallow } from 'zustand/react/shallow'
import { Address } from '@/apps/app/lib/address'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export type VerificationResult = {
    verified: boolean
    skipped: boolean
    mismatches: string[]
}

const isNativeToken = (addr: string | undefined | null): boolean =>
    !addr || addr === ZERO_ADDRESS

export function useSolverLockVerification(): VerificationResult {
    const { solverLockDetails, address, destination_asset, hashlock, destination_network } = useAtomicState()

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

        const mismatches: string[] = []

        // 1. Amount: solver must lock >= expected receive amount
        const expectedAmount = Number(swap.receiveAmount)
        const actualAmount = solverLockDetails.amount
        if (actualAmount !== expectedAmount) {
            mismatches.push(`Amount: expected ${expectedAmount}, got ${actualAmount}`)
        }

        // 2. Recipient: must be user's destination address
        if (address && solverLockDetails.recipient) {
            if (!Address.equals(solverLockDetails.recipient, address, destination_network)) {
                mismatches.push(`Recipient: expected ${address}, got ${solverLockDetails.recipient}`)
            }
        }

        // 3. Token: must match destination asset contract
        const expectedToken = destination_asset?.contractAddress
        const actualToken = solverLockDetails.token
        const expectedIsNative = isNativeToken(expectedToken)
        const actualIsNative = isNativeToken(actualToken)

        if (expectedIsNative !== actualIsNative) {
            mismatches.push(`Token: expected ${expectedIsNative ? 'native' : expectedToken}, got ${actualIsNative ? 'native' : actualToken}`)
        } else if (!expectedIsNative && !actualIsNative) {
            if (actualToken && expectedToken && !Address.equals(actualToken, expectedToken, destination_network)) {
                mismatches.push(`Token: expected ${expectedToken}, got ${actualToken}`)
            }
        }

        return {
            verified: mismatches.length === 0,
            skipped: false,
            mismatches,
        }
    }, [solverLockDetails, swap, address, destination_asset])
}
