import { useSyncExternalStore } from 'react'
import { useStoreContext } from '../providers/TrainProvider'
import type { SwapData } from '../types'

const emptySwaps: Record<string, SwapData> = {}

/**
 * Read-only hook returning all persisted swaps.
 */
export function useSwaps(): Record<string, SwapData> {
    const store = useStoreContext()

    return useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => store?.getState().swaps ?? emptySwaps,
        () => emptySwaps,
    )
}

/**
 * Read-only hook returning the swap data for the active hashlock (if any).
 */
export function useActiveSwap(): SwapData | null {
    const store = useStoreContext()

    return useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => {
            if (!store) return null
            const s = store.getState()
            return s.activeHashlock ? s.swaps[s.activeHashlock] ?? null : null
        },
        () => null,
    )
}
