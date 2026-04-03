import { useSyncExternalStore } from 'react'
import { useStoreContext } from '../providers/TrainProvider'
import type { SwapData } from '../types'

const EMPTY: Record<string, SwapData> = {}

/**
 * Read all persisted swaps.
 *
 * Returns a Record<hashlock, SwapData> of all swaps in the store.
 * This is a read-only accessor for swap history display.
 */
export function useSwaps(): Record<string, SwapData> {
    const store = useStoreContext()

    return useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => store?.getState().swaps ?? EMPTY,
        () => EMPTY,
    )
}
