import { useSwapState, useClearSwapError as useClearSwapErrorHook } from '@train-protocol/react'
import { useSwapStore } from '@/stores/swapStore'

/**
 * Read-only convenience hook: reads activeHashlock from the app store
 * and returns the derived swap lifecycle state.
 *
 * Does NOT start polling — that's done by useSwapProgress(hashlock) in Atomic/index.tsx.
 * All child components should use this hook to read swap state.
 */
export function useActiveSwapState() {
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    return useSwapState(activeHashlock)
}

/**
 * Hook to clear the error on the active swap.
 */
export function useClearSwapError() {
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    return useClearSwapErrorHook(activeHashlock)
}
