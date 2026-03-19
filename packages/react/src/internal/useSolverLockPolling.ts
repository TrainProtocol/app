import { useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { IHTLCClient, SolverLockDetails, LockParams } from '@train-protocol/sdk'
import type { SwapStore } from './store'
import { trainQueryKeys } from './queryKeys'

export interface UseSolverLockPollingOptions {
    client: IHTLCClient | null
    params: LockParams | null
    nodeUrls: string[]
    enabled: boolean
    store: SwapStore | null
    onConsensusFailed?: (error: Error) => void
}

/**
 * Polls the destination chain for solver lock details every 3 seconds.
 * Writes directly to the store with consensus phase tracking.
 *
 * Lifecycle:
 *   1. First detection → store.setSolverLockDetails + consensusPhase='detecting'
 *   2. Multi-node consensus → store.setSolverLockDetails + consensusPhase='verified'
 *   3. Subsequent polls → store.setSolverLockDetails (phase stays 'verified')
 */
export function useSolverLockPolling(options: UseSolverLockPollingOptions): void {
    const { client, params, nodeUrls, enabled, store, onConsensusFailed } = options

    const detected = useRef(false)
    const verified = useRef(false)
    const failed = useRef(false)

    const onConsensusFailedRef = useRef(onConsensusFailed)
    onConsensusFailedRef.current = onConsensusFailed

    // Reset when hashlock (params.id) changes
    useEffect(() => {
        detected.current = false
        verified.current = false
        failed.current = false
    }, [params?.id])

    useQuery({
        queryKey: trainQueryKeys.solverLock(params?.id ?? ''),
        queryFn: async (): Promise<SolverLockDetails | null> => {
            if (!client || !params || failed.current || !store) return null
            const primaryUrl = nodeUrls[0]
            if (!primaryUrl) throw new Error('No node url')

            try {
                const details = await client.getSolverLockDetails(params, primaryUrl)
                if (!details) return null

                // Already verified — just refresh
                if (verified.current) {
                    store.getState().setSolverLockDetails(details)
                    return details
                }

                // First detection
                if (!detected.current) {
                    detected.current = true
                    store.getState().setSolverLockDetails(details)
                    store.getState().setConsensusPhase('detecting')
                }

                // Single node — skip consensus, verify immediately
                if (nodeUrls.length <= 1) {
                    verified.current = true
                    store.getState().setSolverLockDetails(details)
                    store.getState().setConsensusPhase('verified')
                    return details
                }

                // Multi-node consensus
                store.getState().setConsensusPhase('verifying')
                try {
                    const consensusDetails = await client.getSolverLockDetailsWithConsensus(
                        params,
                        nodeUrls,
                        { prefetchedResult: details },
                    )
                    verified.current = true
                    if (consensusDetails) {
                        store.getState().setSolverLockDetails(consensusDetails)
                    }
                    store.getState().setConsensusPhase('verified')
                    return consensusDetails
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err)
                    // Permanent failure: lock details mismatch across nodes
                    if (errorMsg.includes('do not match')) {
                        failed.current = true
                        store.getState().setConsensusPhase('failed')
                        const error = err instanceof Error ? err : new Error(errorMsg)
                        store.getState().setActiveSwapError(error)
                        onConsensusFailedRef.current?.(error)
                        return null
                    }
                    // Transient failure — retry next cycle
                    console.warn('[SolverLockPolling] consensus transient error, will retry:', errorMsg)
                    return null
                }
            } catch (err) {
                console.error('[SolverLockPolling] error:', err)
                throw err
            }
        },
        enabled: enabled && !!client && !!params,
        refetchInterval: () => failed.current ? false : 3000,
        retry: false,
        staleTime: 0,
        gcTime: 0,
        structuralSharing: false,
    })
}
