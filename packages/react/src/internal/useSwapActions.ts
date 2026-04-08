import { useMemo } from 'react'
import { useStoreContext } from '../providers/TrainProvider'
import type { SwapData } from '../types'
import type { HTLCFromApi } from '@train-protocol/sdk'
import type { SwapFlags } from './store'

/**
 * Null-safe wrapper around the swap store.
 *
 * Returns stable, memoized accessors and actions so hooks don't need to
 * repeat `store?.getState().…` boilerplate or handle null-checks themselves.
 *
 * For reactive (subscription-based) reads, use `useStore(store, selector)`
 * or `useSyncExternalStore` directly — this hook is for point-in-time reads
 * and fire-and-forget mutations inside callbacks.
 */
export function useSwapActions() {
    const store = useStoreContext()

    return useMemo(() => ({
        // --- Point-in-time reads ---
        getSwap: (hashlock: string): SwapData | undefined =>
            store?.getState().getSwap(hashlock),
        getSwapFlags: (hashlock: string): SwapFlags | undefined =>
            store?.getState().getSwapFlags(hashlock),
        getOrderData: (hashlock: string): HTLCFromApi | undefined =>
            store?.getState().getOrderData(hashlock),

        // --- Mutations ---
        addSwap: (hashlock: string, data: SwapData) =>
            store?.getState().addSwap(hashlock, data),
        updateSwap: (hashlock: string, updates: Partial<SwapData>) =>
            store?.getState().updateSwap(hashlock, updates),
        clearSwap: (hashlock: string) =>
            store?.getState().clearSwap(hashlock),
        updateSwapFlags: (hashlock: string, updates: Partial<SwapFlags>) =>
            store?.getState().updateSwapFlags(hashlock, updates),
        setOrderData: (hashlock: string, data: HTLCFromApi) =>
            store?.getState().setOrderData(hashlock, data),

        // --- Lifecycle ---
        subscribe: (hashlock: string) =>
            store?.getState().subscribe(hashlock),
        unsubscribe: (hashlock: string) =>
            store?.getState().unsubscribe(hashlock),
    }), [store])
}
