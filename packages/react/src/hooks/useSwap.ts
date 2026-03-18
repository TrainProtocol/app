import { useSwapContext, type ResumeSwapParams } from '../providers/SwapProvider'
import type { HTLCStatus } from '@train-protocol/sdk'
import type { StartSwapParams, SwapData } from '../types'

export interface UseSwapResult {
    status: HTLCStatus
    error: Error | null
    setCurrentSwap: (data: SwapData) => void
    startSwap: (params: StartSwapParams, derivedKey: Uint8Array) => Promise<void>
    resumeSwap: (params: ResumeSwapParams) => void
    revealSecret: () => Promise<void>
    refund: () => Promise<string>
    manualClaim: (secret: string) => Promise<string>
    setError: (error: Error | null) => void
    reset: () => void
}

export function useSwap(): UseSwapResult {
    const ctx = useSwapContext()

    return {
        status: ctx.status,
        error: ctx.error,
        setCurrentSwap: ctx.setCurrentSwap,
        startSwap: ctx.startSwap,
        resumeSwap: ctx.resumeSwap,
        revealSecret: ctx.revealSecret,
        refund: ctx.refund,
        manualClaim: ctx.manualClaim,
        setError: ctx.setError,
        reset: ctx.reset,
    }
}
