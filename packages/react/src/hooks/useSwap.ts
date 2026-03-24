import { useSyncExternalStore } from 'react'
import { useStoreContext } from '../providers/TrainProvider'
import type { SwapData } from '../types'

/**
 * Read a single persisted swap by hashlock.
 *
 * Returns the persisted SwapData or null if not found.
 * This is a read-only accessor — it does not start polling or monitoring.
 * Use `useSwapProgress(hashlock)` to actively monitor a swap.
 */
export function useSwap(hashlock: string | null | undefined): SwapData | null {
    const store = useStoreContext()
    const hl = hashlock ?? null

    return useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => (store && hl) ? store.getState().swaps[hl] ?? null : null,
        () => null,
    )
}
