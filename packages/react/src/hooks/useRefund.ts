import { useState, useCallback } from 'react'
import { HTLCStatus } from '@train-protocol/sdk'
import { useSwapContext } from '../providers/SwapProvider'

export interface UseRefundResult {
    refund: () => Promise<string>
    isRefunding: boolean
    canRefund: boolean
    error: Error | null
}

export function useRefund(): UseRefundResult {
    const ctx = useSwapContext()
    const [isRefunding, setIsRefunding] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const canRefund = ctx.isTimelockExpired && ctx.status === HTLCStatus.TimelockExpired

    const doRefund = useCallback(async (): Promise<string> => {
        setIsRefunding(true)
        setError(null)
        try {
            return await ctx.refund()
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
            throw err
        } finally {
            setIsRefunding(false)
        }
    }, [ctx.refund])

    return { refund: doRefund, isRefunding, canRefund, error }
}
