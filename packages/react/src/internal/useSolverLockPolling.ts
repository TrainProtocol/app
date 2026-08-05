import { useRef, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { IHTLCPublicClient, SolverLockDetails, LockParams } from '@train-protocol/sdk'
import { solverLockTermsMatch } from '@train-protocol/sdk'
import type { ConsensusPhase, VerificationSource } from './store'
import type { LightClientVerifier } from '../types'
import { trainQueryKeys } from './queryKeys'
import { LIGHT_CLIENT_VERIFY_TIMEOUT_MS, LIGHT_CLIENT_BACKSTOP_MS, withTimeout } from './timing'

export interface UseSolverLockPollingOptions {
    client: IHTLCPublicClient | null
    params: LockParams | null
    hashlock: string | null
    nodeUrls: string[]
    enabled: boolean
    /** Trustless verifier for the destination network; tried before RPC consensus when present. */
    lightClient?: LightClientVerifier | null
    /** When true, skip consensus and treat the primary node's response as verified.
     * Used when the user has manually overridden a previous consensus failure. */
    manuallyOverridden?: boolean
    onConsensusFailed?: (error: Error, overridable: boolean) => void
}

export interface SolverLockPollingResult {
    solverLockDetails: SolverLockDetails | null
    consensusPhase: ConsensusPhase
    verifiedNodeCount: number
    verificationSource: VerificationSource
}

const MAX_CONSECUTIVE_RPC_FAILURES = 3

type ConsensusFailKind = 'mismatch' | 'lightClientMismatch' | 'insufficient' | 'rpc' | 'primaryDown'

/** Disagreement about the lock's terms is never overridable — one source is lying. */
const TERMINAL_FAIL_KINDS: ReadonlySet<ConsensusFailKind> = new Set<ConsensusFailKind>([
    'mismatch',
    'lightClientMismatch',
])

const VERIFICATION_ERROR_MESSAGES: Record<ConsensusFailKind, string> = {
    mismatch:
        'Solver lock details disagree across RPC nodes — verification failed. Please wait for the timelock to expire and refund.',
    lightClientMismatch:
        'The solver lock reported by the RPC node disagrees with the lock proven by the light client — verification failed. Please wait for the timelock to expire and refund.',
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
 *   2. Light-client verification (when a verifier is provided) or multi-node
 *      consensus → consensusPhase='verified'
 *   3. Subsequent polls → phase stays 'verified'
 *
 * When a light-client verifier is present it owns the verdict first: detection
 * (or a dead primary — the light client detects independently through its own
 * execution RPC) starts ONE bounded verification attempt. Failure or timeout
 * demotes permanently (for this hashlock) to the legacy RPC-consensus path below.
 *
 * On success the light client's reading is AUTHORITATIVE: it is published to the
 * query cache (which is what gates the irreversible secret reveal) and pinned as
 * the lock's terms. The primary RPC is untrusted, so from then on it may only
 * move `status` forward — any disagreement about the terms is terminal. Without
 * this the light client would only prove that *a* lock exists while the reveal
 * still ran on a single node's account of what that lock says.
 *
 * Failure modes (all set consensusPhase='failed' and fire onConsensusFailed):
 *   - Lock details disagree across nodes (`do not match`) — terminal, not overridable
 *   - The primary RPC contradicts the light client's proven lock — terminal, not overridable
 *   - Quorum unreachable because too few nodes responded — overridable
 *   - Every node we tried errored MAX_CONSECUTIVE_RPC_FAILURES times in a row — overridable
 */
export function useSolverLockPolling(options: UseSolverLockPollingOptions): SolverLockPollingResult {
    const { client, params, hashlock, nodeUrls, enabled, lightClient, manuallyOverridden, onConsensusFailed } = options

    const detected = useRef(false)
    const verified = useRef(false)
    const failed = useRef(false)
    const consecutiveRpcFailures = useRef(0)
    // Last SolverLockDetails we successfully observed. Returned from refetches
    // (e.g. window-focus) once polling is stopped, so the derived htlcStatus
    // doesn't collapse back to UserLocked.
    const lastDetailsRef = useRef<SolverLockDetails | null>(null)

    // Light-client attempt state. 'unavailable' is permanent for the current
    // hashlock generation; lcGeneration invalidates in-flight results across resets.
    const lcAttempt = useRef<'idle' | 'pending' | 'unavailable'>('idle')
    const lcGeneration = useRef(0)
    const lcAbortRef = useRef<AbortController | null>(null)
    // The light client's proven reading of the lock, once it has one. Pins the
    // lock's terms against a later-lying primary node.
    const lcVerifiedRef = useRef<SolverLockDetails | null>(null)

    const queryClient = useQueryClient()

    const [consensusPhase, setConsensusPhase] = useState<ConsensusPhase>('none')
    const [verifiedNodeCount, setVerifiedNodeCount] = useState(0)
    const [verificationSource, setVerificationSource] = useState<VerificationSource>('rpc')

    const onConsensusFailedRef = useRef(onConsensusFailed)
    onConsensusFailedRef.current = onConsensusFailed

    // Reset when hashlock, client, or node URLs change
    const nodeUrlsKey = nodeUrls.join(',')
    useEffect(() => {
        detected.current = false
        verified.current = false
        failed.current = false
        consecutiveRpcFailures.current = 0
        lastDetailsRef.current = null
        lcAttempt.current = 'idle'
        lcGeneration.current += 1
        lcAbortRef.current?.abort()
        lcAbortRef.current = null
        lcVerifiedRef.current = null
        setConsensusPhase('none')
        setVerifiedNodeCount(0)
        setVerificationSource('rpc')
        return () => { lcAbortRef.current?.abort() }
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
            setVerificationSource('manual')
        }
    }, [manuallyOverridden])

    const query = useQuery({
        queryKey: trainQueryKeys.solverLock(params?.id ?? ''),
        queryFn: async (): Promise<SolverLockDetails | null> => {
            if (!client || !params) return lastDetailsRef.current
            // Polling has stopped after a permanent failure — keep returning the
            // last seen details so the cached lock survives a window-focus refetch.
            if (failed.current) return lastDetailsRef.current
            const primaryUrl = nodeUrls[0]
            if (!primaryUrl) throw new Error('No node url')

            const remember = (d: SolverLockDetails | null): SolverLockDetails | null => {
                if (d) lastDetailsRef.current = d
                return d ?? lastDetailsRef.current
            }

            // Write straight to the query cache from outside the queryFn. Needed only by
            // the light-client channel, which settles out of band and must not leave the
            // primary's unverified reading in place once it has a proven one.
            const publish = (d: SolverLockDetails): void => {
                lastDetailsRef.current = d
                queryClient.setQueryData(trainQueryKeys.solverLock(params.id), d)
            }

            const markDetected = () => {
                if (detected.current) return
                detected.current = true
                setConsensusPhase('detecting')
            }

            const markVerified = (count: number, source: VerificationSource = 'rpc') => {
                verified.current = true
                setConsensusPhase('verified')
                setVerifiedNodeCount(count)
                setVerificationSource(source)
            }

            const failVerification = (kind: ConsensusFailKind, cause?: unknown) => {
                failed.current = true
                setConsensusPhase('failed')
                const error = new Error(VERIFICATION_ERROR_MESSAGES[kind])
                if (cause !== undefined) (error as Error & { cause?: unknown }).cause = cause
                onConsensusFailedRef.current?.(error, !TERMINAL_FAIL_KINDS.has(kind))
            }

            // Bumps the transient-failure counter; returns true once we've crossed the threshold.
            const recordRpcFailure = () => {
                consecutiveRpcFailures.current += 1
                return consecutiveRpcFailures.current >= MAX_CONSECUTIVE_RPC_FAILURES
            }

            const verifySingleNode = (primary: PrimaryOutcome): SolverLockDetails | null => {
                if (primary.failed) {
                    if (recordRpcFailure()) failVerification('primaryDown')
                    return remember(null)
                }
                consecutiveRpcFailures.current = 0
                if (!primary.details) return remember(null)
                markDetected()
                markVerified(1)
                return remember(primary.details)
            }

            // Permanently hand the verdict back to the RPC-consensus path (for this
            // hashlock generation). Phase is left as-is: the next tick resumes the
            // legacy branches, so mismatch terminality and failure escalation return.
            const demoteToRpc = (reason: unknown) => {
                console.warn('[SolverLockPolling] light client unavailable, falling back to RPC consensus:', reason)
                lcAttempt.current = 'unavailable'
                setVerificationSource('rpc')
            }

            const runLightClientVerification = async (lc: LightClientVerifier) => {
                const generation = lcGeneration.current
                const controller = new AbortController()
                lcAbortRef.current = controller
                try {
                    const details = await withTimeout(
                        lc.verifySolverLock(params, { signal: controller.signal, timeoutMs: LIGHT_CLIENT_VERIFY_TIMEOUT_MS }),
                        LIGHT_CLIENT_BACKSTOP_MS,
                    )
                    // Stale or superseded (reset, manual override, terminal failure) — discard.
                    if (generation !== lcGeneration.current || verified.current || failed.current) return
                    if (details) {
                        markDetected()
                        // The light client proves what the lock actually says; the primary
                        // node only claims it. If they disagree about the terms, one of them
                        // is lying about a lock we are about to hand a secret for — terminal.
                        const claimedByPrimary = lastDetailsRef.current
                        if (claimedByPrimary && !solverLockTermsMatch(details, claimedByPrimary)) {
                            failVerification(
                                'lightClientMismatch',
                                new Error('Primary RPC lock terms differ from the light-client reading'),
                            )
                            publish(details)
                            return
                        }
                        // Authoritative from here on: publish immediately rather than waiting
                        // for the next tick, so the reveal gate can never read the primary's
                        // unverified version in the window between verdict and refetch.
                        lcVerifiedRef.current = details
                        publish(details)
                        markVerified(0, 'lightClient')
                        return
                    }
                    if (detected.current) {
                        // The primary RPC sees a lock the light client could not observe
                        // within the budget — suspicious; let RPC consensus cross-check it.
                        demoteToRpc('lock not observed within the light-client budget')
                    } else {
                        // No lock anywhere yet (attempt was started by a dead primary).
                        // Re-arm so the next tick starts a fresh attempt.
                        lcAttempt.current = 'idle'
                    }
                } catch (err) {
                    if (generation !== lcGeneration.current || verified.current || failed.current) return
                    controller.abort()
                    demoteToRpc(err)
                }
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
                    if (!result) return remember(primary.details)
                    markVerified(result.agreedCount)
                    return remember(result.details)
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
                        return remember(primary.details)
                    }
                    if (recordRpcFailure()) {
                        failVerification('rpc', err)
                        return remember(primary.details)
                    }
                    console.warn('[SolverLockPolling] consensus transient error, will retry:', message)
                    return remember(primary.details)
                }
            }

            const primary = await fetchFromPrimary(client, params, primaryUrl)

            // Already verified — refresh from primary so status changes (Redeemed)
            // still land. A light-client verdict pins the terms: the primary stays
            // untrusted and may only move the lock forward, never restate the deal.
            if (verified.current) {
                const pinned = lcVerifiedRef.current
                if (pinned && primary.details && !solverLockTermsMatch(pinned, primary.details)) {
                    failVerification(
                        'lightClientMismatch',
                        new Error('Primary RPC restated the lock terms after light-client verification'),
                    )
                    return pinned
                }
                return remember(primary.details)
            }

            // Light-client-first channel: while the verifier owns the verdict, keep
            // polling the primary cheaply — no consensus, no failure escalation.
            if (lightClient && lcAttempt.current !== 'unavailable') {
                if (primary.failed) consecutiveRpcFailures.current += 1
                else consecutiveRpcFailures.current = 0
                if (primary.details) markDetected()
                // Start ONE attempt on detection — or when the primary is persistently
                // down, since the light client detects independently through its own
                // execution RPC. A single primary hiccup must not burn the LC budget
                // before the lock even exists.
                const primaryPersistentlyDown = consecutiveRpcFailures.current >= MAX_CONSECUTIVE_RPC_FAILURES
                if (lcAttempt.current === 'idle' && (primary.details || primaryPersistentlyDown)) {
                    lcAttempt.current = 'pending'
                    setVerificationSource('lightClient')
                    setConsensusPhase('verifying')
                    void runLightClientVerification(lightClient)
                }
                return remember(primary.details)
            }

            // Single-node config — no consensus possible.
            if (nodeUrls.length <= 1) return verifySingleNode(primary)

            // Pre-detection on a healthy primary — keep polling cheaply.
            if (!primary.failed && !primary.details) {
                consecutiveRpcFailures.current = 0
                return remember(null)
            }

            return runConsensus(primary)
        },
        enabled: enabled && !!client && !!params && !!hashlock,
        refetchInterval: () => failed.current ? false : 3000,
        // Polling drives updates; skip auto-refetch on focus/reconnect so
        // brief tab switches (e.g. opening an explorer link) don't re-run
        // the queryFn against dead nodes.
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
        staleTime: 0,
        gcTime: Infinity,
        structuralSharing: false,
    })

    return {
        solverLockDetails: query.data ?? null,
        consensusPhase,
        verifiedNodeCount,
        verificationSource,
    }
}
