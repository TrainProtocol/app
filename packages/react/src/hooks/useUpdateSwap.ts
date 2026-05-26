import { useCallback } from 'react'
import { useSwapActions } from '../internal/useSwapActions'
import type { SwapData } from '../types'

/**
 * Returns a function to update a persisted swap's data by hashlock.
 */
export function useUpdateSwap(): (hashlock: string, updates: Partial<SwapData>) => void {
    const { updateSwap } = useSwapActions()

    return useCallback((hashlock: string, updates: Partial<SwapData>) => {
        updateSwap(hashlock, updates)
    }, [updateSwap])
}
