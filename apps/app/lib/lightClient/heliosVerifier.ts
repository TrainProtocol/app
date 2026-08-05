import type { LightClientVerifier, LightClientVerifyOptions } from '@train-protocol/react'
import type { LockParams, SolverLockDetails } from '@train-protocol/sdk'
import { encodeGetSolverLockData, decodeGetSolverLockResult } from '@train-protocol/evm'
import type { HeliosNetworkEntry } from './networks'

const INIT_TIMEOUT_MS = 25_000
const CHECKPOINT_FETCH_TIMEOUT_MS = 5_000
/** The light client trails the chain head by 1-2 slots, so a lock the RPCs
 * already see may take a couple of retries to become observable. */
const LOCK_RETRY_DELAY_MS = 4_000
const DEFAULT_VERIFY_TIMEOUT_MS = 60_000
/** A warmed-up worker whose verification never starts (swap abandoned before
 * the solver locked) is reaped after this long instead of syncing forever. */
const WARMUP_IDLE_SHUTDOWN_MS = 5 * 60_000

const WORKER_URL = '/workers/helios/heliosWorker.js'

interface PendingRequest {
    resolve: (value: unknown) => void
    reject: (err: Error) => void
    timer: ReturnType<typeof setTimeout>
}

/**
 * One worker plus everything scoped to it: its own id sequence and its own
 * pending map. Sessions are never shared across a teardown, which is what makes
 * the verifier safe to drive concurrently — tearing one down rejects only its
 * own in-flight requests, and a verification that captured an earlier session
 * can never post to a later worker.
 */
class WorkerSession {
    private worker: Worker | null
    private nextId = 1
    private pending = new Map<number, PendingRequest>()
    /**
     * The worker stopped answering. It keeps serving whatever it already has —
     * a peer verification may still be getting replies on its own budget — but
     * no new verification will adopt it.
     */
    wedged = false

    constructor(private readonly onFatal: (session: WorkerSession, err: Error) => void) {
        const worker = new Worker(WORKER_URL, { type: 'module' })
        worker.onmessage = (event) => {
            const { id, ok, result, error } = event.data ?? {}
            const request = this.pending.get(id)
            if (!request) return
            this.pending.delete(id)
            clearTimeout(request.timer)
            if (ok) request.resolve(result)
            else request.reject(new Error(error ?? 'Light client worker error'))
        }
        worker.onerror = (event) =>
            this.onFatal(this, new Error(`Light client worker error: ${event.message ?? 'unknown'}`))
        worker.onmessageerror = () =>
            this.onFatal(this, new Error('Light client worker message deserialization failed'))
        this.worker = worker
    }

    request(type: string, payload: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
        const worker = this.worker
        if (!worker) return Promise.reject(new Error('Light client worker is not running'))
        const id = this.nextId++
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id)
                // Bar the worker from new verifications, but don't tear it down:
                // concurrent verifications hold independent deadlines, and a peer
                // with budget left may still be getting answers.
                this.wedged = true
                reject(new Error(`Light client request '${type}' timed out after ${timeoutMs}ms`))
            }, Math.max(timeoutMs, 1))
            this.pending.set(id, { resolve, reject, timer })
            worker.postMessage({ id, type, ...payload })
        })
    }

    destroy(err: Error): void {
        this.wedged = true
        this.worker?.terminate()
        this.worker = null
        const pending = [...this.pending.values()]
        this.pending.clear()
        for (const request of pending) {
            clearTimeout(request.timer)
            request.reject(err)
        }
    }
}

/**
 * Runs the Helios light client in a web worker and reads the solver lock through
 * it. One instance per network, and it is driven concurrently in practice —
 * `SwapModalRoot` and the `/swap` route both call `useSwapProgress` with the same
 * active hashlock — so all worker state is owned by a `WorkerSession` rather than
 * by the verifier. Each verification captures the session it initialized and
 * routes every request through it.
 *
 * The worker is short-lived: helios re-syncs every slot while alive, so once the
 * last in-flight verification settles (either way) every live session is
 * terminated and the next verification re-inits from a fresh checkpoint (~3-6s,
 * well inside the verify budget). A worker error retires its session immediately;
 * a request timeout only marks it wedged so new verifications get a clean worker.
 */
export class HeliosVerifier implements LightClientVerifier {
    private session: WorkerSession | null = null
    private initPromise: Promise<WorkerSession> | null = null
    /**
     * Every session still holding a worker. A wedged session is detached from
     * `session` while its current users drain, so this is what teardown sweeps.
     */
    private liveSessions = new Set<WorkerSession>()
    private activeVerifications = 0
    private idleTimer: ReturnType<typeof setTimeout> | null = null

    constructor(private entry: HeliosNetworkEntry) { }

    warmUp(): void {
        void this.ensureSession().catch(() => { /* reported by the verify path */ })
        this.armIdleShutdown()
    }

    async verifySolverLock(params: LockParams, opts?: LightClientVerifyOptions): Promise<SolverLockDetails | null> {
        if (!params.solverAddress) throw new Error('solverAddress is required for light-client verification')
        const deadline = Date.now() + (opts?.timeoutMs ?? DEFAULT_VERIFY_TIMEOUT_MS)

        this.activeVerifications += 1
        this.clearIdleTimer()
        try {
            // Capture the session: every request below goes to the worker this
            // verification actually initialized, even if a peer replaces the
            // current one midway.
            const session = await this.ensureSession()
            await session.request('waitSynced', {}, this.remaining(deadline))

            const data = encodeGetSolverLockData(params.id, params.solverAddress)
            while (!opts?.signal?.aborted) {
                const raw = await session.request('ethCall', { to: params.contractAddress, data }, this.remaining(deadline)) as string
                const details = decodeGetSolverLockResult(raw, params.id, params.decimals)
                if (details) return details
                if (Date.now() + LOCK_RETRY_DELAY_MS >= deadline) break
                await sleep(LOCK_RETRY_DELAY_MS)
            }
            return null
        } finally {
            this.activeVerifications -= 1
            if (this.activeVerifications === 0) this.shutdown()
        }
    }

    private ensureSession(): Promise<WorkerSession> {
        if (this.session?.wedged) this.retire(this.session)
        if (!this.initPromise) {
            const attempt: Promise<WorkerSession> = this.initSession().catch((err) => {
                // Clear only if this is still the current attempt — a rejection
                // from a superseded init must not tear down its replacement.
                if (this.initPromise === attempt) {
                    this.session = null
                    this.initPromise = null
                }
                throw err
            })
            this.initPromise = attempt
        }
        return this.initPromise
    }

    private async initSession(): Promise<WorkerSession> {
        const session = new WorkerSession((s, err) => this.discard(s, err))
        this.liveSessions.add(session)
        this.session = session
        try {
            const config = await this.buildConfig()
            await session.request('init', { config, kind: this.entry.kind }, INIT_TIMEOUT_MS)
        } catch (err) {
            this.discard(session, err instanceof Error ? err : new Error(String(err)))
            throw err
        }
        return session
    }

    /** Detach a session from the current slot without killing it — its users keep their reference. */
    private retire(session: WorkerSession): void {
        if (this.session !== session) return
        this.session = null
        this.initPromise = null
    }

    /** Retire and terminate — the worker is known dead, so nothing can still be served by it. */
    private discard(session: WorkerSession, err: Error): void {
        this.retire(session)
        this.liveSessions.delete(session)
        session.destroy(err)
    }

    private async buildConfig() {
        const checkpoint = await fetch(`${this.entry.beaconProxyPath}/eth/v1/beacon/headers/finalized`, {
            signal: AbortSignal.timeout(CHECKPOINT_FETCH_TIMEOUT_MS),
        })
            .then(res => res.json())
            .then(res => (typeof res?.data?.root === 'string' ? res.data.root : null))
            .catch(() => null)

        return {
            executionRpc: this.entry.executionRpc,
            consensusRpc: location.origin + this.entry.beaconProxyPath,
            checkpoint: checkpoint ?? this.entry.fallbackCheckpoint,
            network: this.entry.network,
            // Workers have no localStorage; skip checkpoint persistence — a live
            // finalized checkpoint is fetched on every init anyway.
            dbType: 'config' as const,
        }
    }

    /**
     * Clean terminate once no verification is left (helios syncs every slot while
     * alive). Sweeps every live session, not just the current one, so a wedged
     * session that was detached earlier cannot outlive its last user.
     */
    private shutdown(): void {
        this.clearIdleTimer()
        this.session = null
        this.initPromise = null
        const sessions = [...this.liveSessions]
        this.liveSessions.clear()
        for (const session of sessions) session.destroy(new Error('Light client worker released'))
    }

    private armIdleShutdown(): void {
        this.clearIdleTimer()
        this.idleTimer = setTimeout(() => {
            this.idleTimer = null
            if (this.activeVerifications === 0) this.shutdown()
        }, WARMUP_IDLE_SHUTDOWN_MS)
    }

    private clearIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer)
            this.idleTimer = null
        }
    }

    private remaining(deadline: number): number {
        return Math.max(deadline - Date.now(), 1)
    }
}

function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms))
}
