import { useSyncExternalStore } from 'react'
import { useStoreContext } from '../providers/TrainProvider'
import type { SwapData } from '../types'

/**
 * Returns `currentSwap` (pre-lock) if set, otherwise the committed swap
 * for the active hashlock. This is the unified accessor that replaces
 * the old `tempSwap ?? committedSwap` pattern.
 */
export function useCurrentSwap(): SwapData | null {
    const store = useStoreContext()

    return useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => {
            if (!store) return null
            const state = store.getState()
            return state.currentSwap ?? (state.activeHashlock ? state.swaps[state.activeHashlock] ?? null : null)
        },
        () => null,
    )
}

/**
 * Returns action functions for manipulating swap data in the react package store.
 */
export function useSwapActions() {
    const store = useStoreContext()

    if (!store) {
        throw new Error('useSwapActions must be used within a <TrainProvider>')
    }

    const state = store.getState()
    return {
        clearCurrentSwap: state.clearCurrentSwap,
        setActiveHashlock: state.setActiveHashlock,
        commitSwap: state.commitSwap,
        updateSwap: state.updateSwap,
    }
}
