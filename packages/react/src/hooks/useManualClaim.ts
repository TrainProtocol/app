import { useState, useCallback } from 'react'
import { HTLCStatus } from '@train-protocol/sdk'
import { useSwapContext } from '../providers/SwapProvider'

export interface UseManualClaimResult {
    claim: (secret: string) => Promise<string>
    isClaiming: boolean
    canClaim: boolean
    error: Error | null
}

export function useManualClaim(): UseManualClaimResult {
    const ctx = useSwapContext()
    const [isClaiming, setIsClaiming] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const canClaim = ctx.status === HTLCStatus.ManualClaimRequired

    const claim = useCallback(async (secret: string): Promise<string> => {
        setIsClaiming(true)
        setError(null)
        try {
            return await ctx.manualClaim(secret)
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
            throw err
        } finally {
            setIsClaiming(false)
        }
    }, [ctx.manualClaim])

    return { claim, isClaiming, canClaim, error }
}
