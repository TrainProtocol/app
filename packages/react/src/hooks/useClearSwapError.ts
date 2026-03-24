import { useCallback } from 'react'
import { useStoreContext } from '../providers/TrainProvider'

/**
 * Returns a function that clears the error on the active swap for the given hashlock.
 */
export function useClearSwapError(hashlock: string | null | undefined): () => void {
    const store = useStoreContext()
    const hl = hashlock ?? null

    return useCallback(() => {
        if (store && hl) {
            store.getState().setActiveSwapError(hl, null)
        }
    }, [store, hl])
}
