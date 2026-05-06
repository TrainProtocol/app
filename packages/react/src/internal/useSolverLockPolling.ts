import { useRef, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { IHTLCPublicClient, SolverLockDetails, LockParams } from '@train-protocol/sdk'
import type { ConsensusPhase } from './store'
import { trainQueryKeys } from './queryKeys'

export interface UseSolverLockPollingOptions {
    client: IHTLCPublicClient | null
    params: LockParams | null
    hashlock: string | null
    nodeUrls: string[]
    enabled: boolean
    /** When true, skip consensus and treat the primary node's response as verified.
     * Used when the user has manually overridden a previous consensus failure. */
    manuallyOverridden?: boolean
    onConsensusFailed?: (error: Error) => void
}

export interface SolverLockPollingResult {
    solverLockDetails: SolverLockDetails | null
    consensusPhase: ConsensusPhase
    verifiedNodeCount: number
}

const MAX_CONSECUTIVE_RPC_FAILURES = 3

type ConsensusFailKind = 'mismatch' | 'insufficient' | 'rpc' | 'primaryDown'

const VERIFICATION_ERROR_MESSAGES: Record<ConsensusFailKind, string> = {
    mismatch:
        'Solver lock details disagree across RPC nodes — verification failed. Please wait for the timelock to expire and refund.',
    insufficient:
        "We can't verify the solver's lock right now — too few RPC nodes are responding. You can review the lock and continue manually, or wait for the timelock to expire and refund.",
    rpc:
        "We can't verify the solver's lock right now — every RPC node we tried failed to respond. You can review the lock and continue manually, or wait for the timelock to expire and refund.",
    primaryDown:
        "We can't verify the solver's lock right now — the RPC node is unreachable. You can review the lock and continue manually, or wait for the timelock to expire and refund.",
}

function classifyConsensusError(message: string): ConsensusFailKind {
    if (message.includes('do not match')) return 'mismatch'
    if (message.includes('Insufficient node agreement')) return 'insufficient'
    return 'rpc'
}

interface PrimaryOutcome {
    details: SolverLockDetails | null
    failed: boolean
}

async function fetchFromPrimary(
    client: IHTLCPublicClient,
    params: LockParams,
    nodeUrl: string,
): Promise<PrimaryOutcome> {
    try {
        return { details: await client.getSolverLockDetails(params, nodeUrl), failed: false }
    } catch (err) {
        console.warn('[SolverLockPolling] primary node failed:', err)
        return { details: null, failed: true }
    }
}

/**
 * Polls the destination chain for solver lock details every 3 seconds.
 * Returns data directly — no store writes.
 *
 * Lifecycle:
 *   1. First detection → consensusPhase='detecting'
 *   2. Multi-node consensus → consensusPhase='verified'
 *   3. Subsequent polls → phase stays 'verified'
 *
 * Failure modes (all set consensusPhase='failed' and fire onConsensusFailed):
 *   - Lock details disagree across nodes (`do not match`) — terminal, not overridable
 *   - Quorum unreachable because too few nodes responded — overridable
 *   - Every node we tried errored MAX_CONSECUTIVE_RPC_FAILURES times in a row — overridable
 */
export function useSolverLockPolling(options: UseSolverLockPollingOptions): SolverLockPollingResult {
    const { client, params, hashlock, nodeUrls, enabled, manuallyOverridden, onConsensusFailed } = options

    const detected = useRef(false)
    const verified = useRef(false)
    const failed = useRef(false)
    const consecutiveRpcFailures = useRef(0)

    const [consensusPhase, setConsensusPhase] = useState<ConsensusPhase>('none')
    const [verifiedNodeCount, setVerifiedNodeCount] = useState(0)

    const onConsensusFailedRef = useRef(onConsensusFailed)
    onConsensusFailedRef.current = onConsensusFailed

    // Reset when hashlock, client, or node URLs change
    const nodeUrlsKey = nodeUrls.join(',')
    useEffect(() => {
        detected.current = false
        verified.current = false
        failed.current = false
        consecutiveRpcFailures.current = 0
        setConsensusPhase('none')
        setVerifiedNodeCount(0)
    }, [hashlock, client, nodeUrlsKey])

    // Honor an external manual override (e.g. user clicked "Verify and continue"
    // after a previous consensus failure). This sticks even across remounts as
    // long as the swap flags carry the override forward.
    useEffect(() => {
        if (manuallyOverridden) {
            verified.current = true
            failed.current = false
            consecutiveRpcFailures.current = 0
            setConsensusPhase('verified')
            setVerifiedNodeCount(0)
        }
    }, [manuallyOverridden])

    const query = useQuery({
        queryKey: trainQueryKeys.solverLock(params?.id ?? ''),
        queryFn: async (): Promise<SolverLockDetails | null> => {
            if (!client || !params || failed.current) return null
            const primaryUrl = nodeUrls[0]
            if (!primaryUrl) throw new Error('No node url')

            const markDetected = () => {
                if (detected.current) return
                detected.current = true
                setConsensusPhase('detecting')
            }

            const markVerified = (count: number) => {
                verified.current = true
                setConsensusPhase('verified')
                setVerifiedNodeCount(count)
            }

            const failVerification = (kind: ConsensusFailKind, cause?: unknown) => {
                failed.current = true
                setConsensusPhase('failed')
                const error = new Error(VERIFICATION_ERROR_MESSAGES[kind])
                if (cause !== undefined) (error as Error & { cause?: unknown }).cause = cause
                onConsensusFailedRef.current?.(error)
            }

            // Bumps the transient-failure counter; returns true once we've crossed the threshold.
            const recordRpcFailure = () => {
                consecutiveRpcFailures.current += 1
                return consecutiveRpcFailures.current >= MAX_CONSECUTIVE_RPC_FAILURES
            }

            const verifySingleNode = (primary: PrimaryOutcome): SolverLockDetails | null => {
                if (primary.failed) {
                    if (recordRpcFailure()) failVerification('primaryDown')
                    return null
                }
                consecutiveRpcFailures.current = 0
                if (!primary.details) return null
                markDetected()
                markVerified(1)
                return primary.details
            }

            const runConsensus = async (primary: PrimaryOutcome): Promise<SolverLockDetails | null> => {
                if (primary.details) markDetected()
                setConsensusPhase('verifying')
                try {
                    const result = await client.getSolverLockDetailsWithConsensus(
                        params,
                        nodeUrls,
                        primary.details ? { prefetchedResult: primary.details } : undefined,
                    )
                    consecutiveRpcFailures.current = 0
                    // Reachable nodes returned null — solver hasn't locked yet on any of them.
                    if (!result) return primary.details
                    markVerified(result.agreedCount)
                    return result.details
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err)
                    const kind = classifyConsensusError(message)

                    if (kind === 'mismatch') {
                        // Genuine cross-node disagreement — terminal, not overridable.
                        failVerification('mismatch', err)
                        return null
                    }
                    if (kind === 'insufficient') {
                        // Quorum unreachable — keep primary so the user can manually verify and continue.
                        failVerification('insufficient', err)
                        return primary.details
                    }
                    if (recordRpcFailure()) {
                        failVerification('rpc', err)
                        return primary.details
                    }
                    console.warn('[SolverLockPolling] consensus transient error, will retry:', message)
                    return primary.details
                }
            }

            const primary = await fetchFromPrimary(client, params, primaryUrl)

            // Already verified — just refresh from primary.
            if (verified.current) return primary.details

            // Single-node config — no consensus possible.
            if (nodeUrls.length <= 1) return verifySingleNode(primary)

            // Pre-detection on a healthy primary — keep polling cheaply.
            if (!primary.failed && !primary.details) {
                consecutiveRpcFailures.current = 0
                return null
            }

            return runConsensus(primary)
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
        verifiedNodeCount,
    }
}
