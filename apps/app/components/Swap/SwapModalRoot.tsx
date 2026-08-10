"use client"

import { useCallback, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useSwapProgress, HTLCStatus } from "@train-protocol/react"
import VaulDrawer from "../Modal/vaulModal"
import AtomicPage from "../Swap/AtomicChat"
import { useSwapStore } from "@/stores/swapStore"
import { useSwapPhaseTracking } from "@/hooks/useSwapPhaseTracking"
import { captureEvent } from "@/lib/faro"

export default function SwapModalRoot() {
    const pathname = usePathname()
    const swapModalOpen = useSwapStore(s => s.swapModalOpen)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const pendingFormValues = useSwapStore(s => s.pendingFormValues)
    const setPendingFormValues = useSwapStore(s => s.setPendingFormValues)
    const { status: htlcStatus } = useSwapProgress(activeHashlock)
    useSwapPhaseTracking()

    useEffect(() => {
        setSwapModalOpen(false)
    }, [pathname])

    const handleShowSwapModal = useCallback((value: boolean) => {
        setSwapModalOpen(value)
        if (!value) {
            setPendingFormValues(undefined)
            captureEvent("swap_modal_closed", {
                htlc_status: htlcStatus ?? "none",
                hashlock: activeHashlock ?? undefined,
                was_terminal: htlcStatus === HTLCStatus.RedeemCompleted || htlcStatus === HTLCStatus.Refunded,
            })
        }
    }, [setSwapModalOpen, setPendingFormValues, htlcStatus, activeHashlock])

    const handleDrawerAnimationEnd = useCallback((open: boolean) => {
        if (!open) {
            const isTerminal = htlcStatus === HTLCStatus.RedeemCompleted || htlcStatus === HTLCStatus.Refunded
            if (isTerminal) {
                setActiveHashlock(null)
            }
        }
    }, [htlcStatus, setActiveHashlock])

    return (
        <VaulDrawer
            mode="fitHeight"
            show={swapModalOpen}
            setShow={handleShowSwapModal}
            header="Complete the swap"
            modalId="showAtomicSwapGlobal"
            className="expandContainerHeight"
            onAnimationEnd={handleDrawerAnimationEnd}
        >
            <AtomicPage type="contained" formValues={pendingFormValues} />
        </VaulDrawer>
    )
}
