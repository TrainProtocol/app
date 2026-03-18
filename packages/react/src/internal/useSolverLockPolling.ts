import { useCallback, useRef, useEffect } from 'react'
import type { IHTLCClient, SolverLockDetails, LockParams } from '@train-protocol/sdk'
import { usePolling } from './usePolling'

export interface UseSolverLockPollingOptions {
    client: IHTLCClient | null
    params: LockParams | null
    nodeUrls: string[]
    enabled: boolean
    /** Fired once on first detection (before consensus). */
    onDetected?: (details: SolverLockDetails) => void
    /** Fired once after multi-node consensus succeeds (or immediately for single-node). */
    onVerified?: (details: SolverLockDetails) => void
    /** Fired on subsequent polls after verification. */
    onRefresh?: (details: SolverLockDetails) => void
    /** Fired on permanent consensus failure (node mismatch). */
    onConsensusFailed?: (error: Error) => void
}

/**
 * Polls the destination chain for solver lock details every 3 seconds.
 *
 * Lifecycle:
 *   1. First detection → fires `onDetected` (UI can show "verifying")
 *   2. Multi-node consensus → fires `onVerified` (UI can show "verified")
 *   3. Subsequent polls → fires `onRefresh` (data update only)
 *
 * All consensus logic is internal — callers receive clean, phase-separated callbacks.
 */
export function useSolverLockPolling(options: UseSolverLockPollingOptions): void {
    const { client, params, nodeUrls, enabled, onDetected, onVerified, onRefresh, onConsensusFailed } = options

    const detected = useRef(false)
    const verified = useRef(false)
    const failed = useRef(false)

    // Reset when hashlock (params.id) changes
    useEffect(() => {
        detected.current = false
        verified.current = false
        failed.current = false
    }, [params?.id])

    const fetcher = useCallback(async () => {
        if (!client || !params || failed.current) return null
        const primaryUrl = nodeUrls[0]
        if (!primaryUrl) throw new Error('No node url')

        try {
            const details = await client.getSolverLockDetails(params, primaryUrl)
            if (!details) return null

            // Already verified — just refresh
            if (verified.current) {
                onRefresh?.(details)
                return details
            }

            // First detection — fire onDetected once
            if (!detected.current) {
                detected.current = true
                onDetected?.(details)
            }

            // Single node — skip consensus, verify immediately
            if (nodeUrls.length <= 1) {
                verified.current = true
                onVerified?.(details)
                return details
            }

            // Multi-node consensus
            try {
                const consensusDetails = await client.getSolverLockDetailsWithConsensus(
                    params,
                    nodeUrls,
                    { prefetchedResult: details },
                )
                verified.current = true
                if (consensusDetails) onVerified?.(consensusDetails)
                return consensusDetails
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err)
                // Permanent failure: lock details mismatch across nodes
                if (errorMsg.includes('do not match')) {
                    failed.current = true
                    onConsensusFailed?.(err instanceof Error ? err : new Error(errorMsg))
                    return null
                }
                // Transient failure — retry next cycle (detected stays true, won't re-fire onDetected)
                console.warn('[SolverLockPolling] consensus transient error, will retry:', errorMsg)
                return null
            }
        } catch (err) {
            console.error('[SolverLockPolling] error:', err)
            throw err
        }
    }, [client, params, nodeUrls, onDetected, onVerified, onRefresh, onConsensusFailed])

    usePolling(fetcher, {
        interval: 3000,
        enabled: enabled && !!client && !!params,
    })
}
