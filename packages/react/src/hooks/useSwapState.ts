import { useStoreContext } from '../providers/TrainProvider'
import { useDerivedSwapState, type DerivedSwapState } from '../internal/useDerivedSwapState'

/**
 * Read-only hook that returns derived swap lifecycle state for a given hashlock.
 *
 * Does NOT start polling or manage the swap lifecycle.
 * Use `useSwapProgress(hashlock)` once (at the top level) to activate polling,
 * then use `useSwapState(hashlock)` in child components to read the state.
 */
export function useSwapState(hashlock: string | null | undefined): DerivedSwapState {
    const store = useStoreContext()
    return useDerivedSwapState(store, hashlock ?? null)
}
