import { useCallback } from 'react'
import { useStoreContext } from '../providers/TrainProvider'
import type { SwapData } from '../types'

/**
 * Returns a function to update a persisted swap's data by hashlock.
 */
export function useUpdateSwap(): (hashlock: string, updates: Partial<SwapData>) => void {
    const store = useStoreContext()

    return useCallback((hashlock: string, updates: Partial<SwapData>) => {
        if (store) {
            store.getState().updateSwap(hashlock, updates)
        }
    }, [store])
}
