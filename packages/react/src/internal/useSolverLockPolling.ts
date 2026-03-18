import { useCallback, useRef, useState, useEffect } from 'react'
import type { IHTLCClient, SolverLockDetails, LockParams } from '@train-protocol/sdk'
import { usePolling } from './usePolling'

export interface UseSolverLockPollingOptions {
    client: IHTLCClient | null
    params: LockParams | null
    nodeUrls: string[]
    enabled: boolean
    onSuccess?: (details: SolverLockDetails) => void
    onConsensusFailed?: (error: Error) => void
}

export interface SolverLockPollingResult {
    consensusVerifying: boolean
    consensusVerified: boolean
}

/**
 * Polls the destination chain for solver lock details every 3 seconds.
 * On first detection, verifies the lock with multi-node consensus before
 * falling back to fast single-node polling.
 */
export function useSolverLockPolling(options: UseSolverLockPollingOptions): SolverLockPollingResult {
    const { client, params, nodeUrls, enabled, onSuccess, onConsensusFailed } = options

    const consensusVerified = useRef(false)
    const consensusFailed = useRef(false)
    const [consensusVerifying, setConsensusVerifying] = useState(false)

    // Reset consensus state when hashlock (params.id) changes
    useEffect(() => {
        consensusVerified.current = false
        consensusFailed.current = false
        setConsensusVerifying(false)
    }, [params?.id])

    const fetcher = useCallback(async () => {
        if (!client || !params) return null
        if (consensusFailed.current) return null
        const primaryUrl = nodeUrls[0]
        if (!primaryUrl) throw new Error("No node url") //TODO revisit this

        try {
            // Fast single-node fetch
            const details = await client.getSolverLockDetails(params, primaryUrl)
            if (!details) return null

            // On first detection, verify with multi-node consensus
            if (!consensusVerified.current && nodeUrls.length > 1) {
                setConsensusVerifying(true)
                try {
                    const consensusDetails = await client.getSolverLockDetailsWithConsensus(
                        params,
                        nodeUrls,
                        { prefetchedResult: details }
                    )
                    consensusVerified.current = true
                    setConsensusVerifying(false)
                    if (consensusDetails) onSuccess?.(consensusDetails)
                    return consensusDetails
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err)
                    // Permanent failure: lock details mismatch across nodes
                    if (errorMsg.includes('do not match')) {
                        consensusFailed.current = true
                        setConsensusVerifying(false)
                        onConsensusFailed?.(err instanceof Error ? err : new Error(errorMsg))
                        return null
                    }
                    // Transient failure (network issues, insufficient quorum): retry next cycle
                    console.warn('[SolverLockPolling] consensus verification transient error, will retry:', errorMsg)
                    return null
                }
            }

            // Already verified or single node — use direct result
            onSuccess?.(details)
            return details
        } catch (err) {
            console.error('[SolverLockPolling] error:', err)
            throw err
        }
    }, [client, params, nodeUrls, onSuccess, onConsensusFailed])

    usePolling(fetcher, {
        interval: 3000,
        enabled: enabled && !!client && !!params,
    })

    return {
        consensusVerifying,
        consensusVerified: consensusVerified.current,
    }
}
