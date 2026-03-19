import { useSyncExternalStore } from 'react'
import { useStoreContext } from '../providers/TrainProvider'

/**
 * Read-only hook returning the active hashlock from the swap store.
 */
export function useActiveHashlock(): string | null {
    const store = useStoreContext()

    return useSyncExternalStore(
        (cb) => store ? store.subscribe(cb) : () => {},
        () => store?.getState().activeHashlock ?? null,
        () => null,
    )
}
