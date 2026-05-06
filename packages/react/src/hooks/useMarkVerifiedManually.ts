import { useCallback } from 'react'
import { useSwapActions } from '../internal/useSwapActions'

/**
 * Returns a function that overrides a failed solver-lock consensus check.
 * Use when our RPC nodes can't reach quorum and the user has independently
 * verified the solver's on-chain lock and wants to continue the flow.
 */
export function useMarkVerifiedManually(hashlock: string | null | undefined): () => void {
    const { markVerifiedManually } = useSwapActions()
    const hl = hashlock ?? null

    return useCallback(() => {
        if (hl) markVerifiedManually(hl)
    }, [markVerifiedManually, hl])
}
