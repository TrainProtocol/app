import { useSwapState, useClearSwapError as useClearSwapErrorHook, useMarkVerifiedManually as useMarkVerifiedManuallyHook } from '@train-protocol/react'
import { useSwapStore } from '@/stores/swapStore'

/**
 * Read-only convenience hook: reads activeHashlock from the app store
 * and returns the full derived swap state (lifecycle + persisted data + resolved Network/Token).
 *
 * Does NOT start polling — that's done by useSwapProgress(hashlock) in Atomic/index.tsx.
 * All child components should use this hook to read swap state.
 */
export function useActiveSwap() {
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

/**
 * Manually override a failed solver-lock consensus check on the active swap.
 */
export function useMarkVerifiedManually() {
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    return useMarkVerifiedManuallyHook(activeHashlock)
}
