import { useCallback } from 'react'
import { useSwapContext } from '../providers/SwapProvider'
import type { HTLCStatus } from '@train-protocol/sdk'
import type { StartSwapParams } from '../types'

export interface UseSwapResult {
    status: HTLCStatus
    error: Error | null
    startSwap: (params: StartSwapParams, derivedKey: Buffer) => Promise<void>
    revealSecret: () => Promise<void>
    refund: () => Promise<string>
    reset: () => void
}

export function useSwap(): UseSwapResult {
    const ctx = useSwapContext()

    return {
        status: ctx.status,
        error: ctx.error,
        startSwap: ctx.startSwap,
        revealSecret: ctx.revealSecret,
        refund: ctx.refund,
        reset: ctx.reset,
    }
}
