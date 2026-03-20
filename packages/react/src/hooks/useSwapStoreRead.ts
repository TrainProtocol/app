import { useCallback } from 'react'
import { useStoreContext } from '../providers/TrainProvider'
import type { SwapData } from '../types'

/**
 * Read-only imperative access to the swap store.
 * Use this for reading swap data inside callbacks or effects
 * without exposing store mutators.
 */
export function useSwapStoreRead() {
    const store = useStoreContext()

    const getSwap = useCallback((hashlock: string): SwapData | null => {
        return store?.getState().swaps[hashlock] ?? null
    }, [store])

    const getCurrentSwapData = useCallback((): SwapData | null => {
        if (!store) return null
        const state = store.getState()
        return state.currentSwap ?? (state.activeHashlock ? state.swaps[state.activeHashlock] ?? null : null)
    }, [store])

    const getAllSwaps = useCallback((): Record<string, SwapData> => {
        return store?.getState().swaps ?? {}
    }, [store])

    return { getSwap, getCurrentSwapData, getAllSwaps }
}
