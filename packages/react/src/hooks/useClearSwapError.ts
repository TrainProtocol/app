import { useCallback } from 'react'
import { useSwapActions } from '../internal/useSwapActions'

/**
 * Returns a function that clears the error on the active swap for the given hashlock.
 */
export function useClearSwapError(hashlock: string | null | undefined): () => void {
    const { updateSwapFlags } = useSwapActions()
    const hl = hashlock ?? null

    return useCallback(() => {
        if (hl) {
            updateSwapFlags(hl, { error: null })
        }
    }, [updateSwapFlags, hl])
}
