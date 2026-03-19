import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSettingsState } from '@/context/settings'
import { isTerminalStatus } from '@/Models/HTLCStatus'
import { useSwapState, useSwap, useActiveHashlock, useSwapActions } from '@train-protocol/react'
import { useStoreContext } from '@train-protocol/react'

/**
 * Side-effect hook that bridges the @train-protocol/react SwapProvider
 * with URL state. Reads swap data from the react package store.
 *
 * Call once at the layout level — produces no return value.
 */
export function useSwapSync() {
    const router = useRouter()
    const { networks } = useSettingsState()
    const activeHashlock = useActiveHashlock()
    const { setActiveHashlock } = useSwapActions()
    // Use store directly for imperative reads inside effects —
    // using reactive `useSwaps()` here would cause effects to re-fire
    // on every store update, which can interfere with in-flight swaps.
    const store = useStoreContext()

    const swapState = useSwapState()
    const { resumeSwap } = useSwap()

    // 1. URL restore — read hashlock from URL query, set activeHashlock
    useEffect(() => {
        const hashlockFromUrl = router.query.hashlock as string | undefined
        if (!hashlockFromUrl || activeHashlock || !store) return

        const swap = store.getState().swaps[hashlockFromUrl]
        if (swap && !isTerminalStatus(swap.status)) {
            setActiveHashlock(hashlockFromUrl)
        }
    }, [router.query.hashlock, activeHashlock, store, setActiveHashlock])

    // 2. Resume swap in SwapProvider when activeHashlock changes
    useEffect(() => {
        if (!activeHashlock || !store) return
        if (swapState.hashlock === activeHashlock) return

        const swap = store.getState().swaps[activeHashlock]
        if (!swap) return

        const sourceNetwork = networks.find(n => n.caip2Id.toUpperCase() === swap.source?.toUpperCase())
        const sourceAsset = sourceNetwork?.tokens.find(t => t.symbol === swap.source_asset)

        resumeSwap({
            hashlock: activeHashlock,
            txId: swap.txId,
            sourceNetwork: swap.source,
            destinationNetwork: swap.destination,
            srcContract: swap.srcContract,
            destContract: swap.destContract,
            tokenContractAddress: sourceAsset?.contractAddress,
            sourceAddress: swap.address,
            destinationAddress: swap.address,
            solverId: swap.solver,
            sourceAsset: sourceAsset ?? null,
            destinationAsset: swap.destination_asset,
            requestedAmount: swap.requestedAmount,
            secretRevealed: swap.secretRevealed,
            destinationSolverAddress: swap.destinationSolverAddress,
        })
    }, [activeHashlock, store, networks, swapState.hashlock, resumeSwap])

    // 3. Clean up stale activeHashlock (terminal swaps)
    useEffect(() => {
        if (!activeHashlock || !store) return

        const swap = store.getState().swaps[activeHashlock]
        if (!swap || isTerminalStatus(swap.status)) {
            setActiveHashlock(null)
        }
    }, [activeHashlock, store, setActiveHashlock])
}
