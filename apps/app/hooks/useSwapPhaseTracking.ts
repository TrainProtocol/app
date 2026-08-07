import { useEffect, useRef } from "react"
import { HTLCStatus, TrainErrorCode } from "@train-protocol/react"
import { useActiveSwap } from "@/hooks/useActiveSwap"
import { captureEvent, clearSwapContext } from "@/lib/faro"

// Events named per milestone status; absence of the next event in a session = drop-off at that stage.
const STATUS_EVENTS: Partial<Record<HTLCStatus, string>> = {
    [HTLCStatus.UserLocked]: "user_lock_confirmed",
    [HTLCStatus.SolverLockDetected]: "solver_lock_detected",
    [HTLCStatus.ManualClaimRequired]: "manual_claim_required",
    [HTLCStatus.RedeemCompleted]: "swap_completed",
    [HTLCStatus.TimelockExpired]: "refund_available",
    [HTLCStatus.Refunded]: "swap_refunded",
}

// Module-level so a remount (modal close/reopen, route change) never re-fires a
// milestone that was already reported for this hashlock.
const firedMilestones = new Set<string>()

/**
 * Watches the active swap's derived lifecycle and emits one analytics event per
 * milestone transition. Mount exactly once, next to useSwapProgress (SwapModalRoot),
 * which is rendered on every route — tracking continues even with the modal closed.
 */
export function useSwapPhaseTracking() {
    const {
        hashlock,
        status,
        error,
        consensusVerified,
        consensusFailed,
        verifiedNodeCount,
        destRedeemTxId,
        createdAt,
        source,
        destination,
    } = useActiveSwap()

    const fireOnce = (name: string, attrs?: Record<string, unknown>) => {
        const key = `${hashlock}:${name}`
        if (firedMilestones.has(key)) return
        firedMilestones.add(key)
        captureEvent(name, {
            hashlock,
            source_network: source ?? undefined,
            destination_network: destination ?? undefined,
            ...attrs,
        })
    }
    const fireOnceRef = useRef(fireOnce)
    fireOnceRef.current = fireOnce

    useEffect(() => {
        if (!hashlock || !status) return
        const eventName = STATUS_EVENTS[status]
        if (!eventName) return

        const elapsedMs = createdAt ? Date.now() - createdAt : undefined
        fireOnceRef.current(eventName, {
            elapsed_ms: elapsedMs,
            ...(status === HTLCStatus.RedeemCompleted ? { dest_redeem_tx: destRedeemTxId ?? undefined } : {}),
        })

        if (status === HTLCStatus.RedeemCompleted || status === HTLCStatus.Refunded) {
            clearSwapContext()
        }
    }, [hashlock, status, createdAt, destRedeemTxId])

    // RPC consensus verification outcome (semantic quote-match verification is
    // tracked separately in SolverLockDetectedAction where mismatches surface).
    useEffect(() => {
        if (!hashlock) return
        if (consensusVerified) fireOnceRef.current("verification_passed", { verified_node_count: verifiedNodeCount })
        else if (consensusFailed) fireOnceRef.current("verification_failed", { message: error?.message })
    }, [hashlock, consensusVerified, consensusFailed, verifiedNodeCount, error?.message])

    // Store-level errors: on-chain lock failure and solver-side order failure.
    useEffect(() => {
        if (!hashlock || !error?.code) return
        if (error.code === TrainErrorCode.UserLockTransactionFailed) {
            fireOnceRef.current("user_lock_failed", { reason: "transaction_failed", message: error.message })
        } else if (error.code === TrainErrorCode.OrderFailed) {
            fireOnceRef.current("swap_order_failed", { message: error.message })
        }
    }, [hashlock, error?.code, error?.message])
}
