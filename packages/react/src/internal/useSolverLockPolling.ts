import { useRef, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { IHTLCReadClient, SolverLockDetails, LockParams } from '@train-protocol/sdk'
import type { ConsensusPhase } from './store'
import { trainQueryKeys } from './queryKeys'

export interface UseSolverLockPollingOptions {
    client: IHTLCReadClient | null
    params: LockParams | null
    hashlock: string | null
    nodeUrls: string[]
    enabled: boolean
    onConsensusFailed?: (error: Error) => void
}

export interface SolverLockPollingResult {
    solverLockDetails: SolverLockDetails | null
    consensusPhase: ConsensusPhase
}

/**
 * Polls the destination chain for solver lock details every 3 seconds.
 * Returns data directly — no store writes.
 *
 * Lifecycle:
 *   1. First detection → consensusPhase='detecting'
 *   2. Multi-node consensus → consensusPhase='verified'
 *   3. Subsequent polls → phase stays 'verified'
 */
export function useSolverLockPolling(options: UseSolverLockPollingOptions): SolverLockPollingResult {
    const { client, params, hashlock, nodeUrls, enabled, onConsensusFailed } = options

    const detected = useRef(false)
    const verified = useRef(false)
    const failed = useRef(false)

    const [consensusPhase, setConsensusPhase] = useState<ConsensusPhase>('none')

    const onConsensusFailedRef = useRef(onConsensusFailed)
    onConsensusFailedRef.current = onConsensusFailed

    // Reset when hashlock, client, or node URLs change
    const nodeUrlsKey = nodeUrls.join(',')
    useEffect(() => {
        detected.current = false
        verified.current = false
        failed.current = false
        setConsensusPhase('none')
    }, [hashlock, client, nodeUrlsKey])

    const query = useQuery({
        queryKey: trainQueryKeys.solverLock(params?.id ?? ''),
        queryFn: async (): Promise<SolverLockDetails | null> => {
            if (!client || !params || failed.current) return null
            const primaryUrl = nodeUrls[0]
            if (!primaryUrl) throw new Error('No node url')

            try {
                const details = await client.getSolverLockDetails(params, primaryUrl)
                if (!details) return null

                // Already verified — just refresh
                if (verified.current) {
                    return details
                }

                // First detection
                if (!detected.current) {
                    detected.current = true
                    setConsensusPhase('detecting')
                }

                // Single node — skip consensus, verify immediately
                if (nodeUrls.length <= 1) {
                    verified.current = true
                    setConsensusPhase('verified')
                    return details
                }

                // Multi-node consensus
                setConsensusPhase('verifying')
                try {
                    const consensusDetails = await client.getSolverLockDetailsWithConsensus(
                        params,
                        nodeUrls,
                        { prefetchedResult: details },
                    )
                    verified.current = true
                    setConsensusPhase('verified')
                    return consensusDetails
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err)
                    // Permanent failure: lock details mismatch across nodes
                    if (errorMsg.includes('do not match')) {
                        failed.current = true
                        setConsensusPhase('failed')
                        const error = err instanceof Error ? err : new Error(errorMsg)
                        onConsensusFailedRef.current?.(error)
                        return null
                    }
                    // Transient failure — retry next cycle.
                    // Return the already-fetched details so the UI stays stable
                    // instead of clearing the cached solver lock to null.
                    console.warn('[SolverLockPolling] consensus transient error, will retry:', errorMsg)
                    return details
                }
            } catch (err) {
                console.error('[SolverLockPolling] error:', err)
                throw err
            }
        },
        enabled: enabled && !!client && !!params && !!hashlock,
        refetchInterval: () => failed.current ? false : 3000,
        retry: false,
        staleTime: 0,
        gcTime: Infinity,
        structuralSharing: false,
    })

    return {
        solverLockDetails: query.data ?? null,
        consensusPhase,
    }
}
