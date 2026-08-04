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

interface PendingRequest {
    resolve: (value: unknown) => void
    reject: (err: Error) => void
    timer: ReturnType<typeof setTimeout>
}

/**
 * Runs the Helios light client in a web worker and reads the solver lock through
 * it. One instance per network; the worker stays alive across swaps (helios keeps
 * following the head, so later verifications skip the sync cost). Any worker
 * error or per-request timeout destroys the worker so a wedged instance can never
 * survive into the next attempt — `ensureInit` then starts fresh.
 */
export class HeliosVerifier implements LightClientVerifier {
    private worker: Worker | null = null
    private initPromise: Promise<void> | null = null
    private nextId = 1
    private pending = new Map<number, PendingRequest>()

    constructor(private entry: HeliosNetworkEntry) { }

    warmUp(): void {
        void this.ensureInit().catch(() => { /* reported by the verify path */ })
    }

    async verifySolverLock(params: LockParams, opts?: LightClientVerifyOptions): Promise<SolverLockDetails | null> {
        if (!params.solverAddress) throw new Error('solverAddress is required for light-client verification')
        const deadline = Date.now() + (opts?.timeoutMs ?? DEFAULT_VERIFY_TIMEOUT_MS)

        await this.ensureInit()
        await this.request('waitSynced', {}, this.remaining(deadline))

        const data = encodeGetSolverLockData(params.id, params.solverAddress)
        while (!opts?.signal?.aborted) {
            const raw = await this.request('ethCall', { to: params.contractAddress, data }, this.remaining(deadline)) as string
            const details = decodeGetSolverLockResult(raw, params.id, params.decimals)
            if (details) return details
            if (Date.now() + LOCK_RETRY_DELAY_MS >= deadline) break
            await sleep(LOCK_RETRY_DELAY_MS)
        }
        return null
    }

    private ensureInit(): Promise<void> {
        if (!this.initPromise) {
            this.initPromise = this.doInit().catch((err) => {
                this.destroy(err instanceof Error ? err : new Error(String(err)))
                throw err
            })
        }
        return this.initPromise
    }

    private async doInit(): Promise<void> {
        const worker = new Worker('/workers/helios/heliosWorker.js', { type: 'module' })
        worker.onmessage = (event) => {
            const { id, ok, result, error } = event.data ?? {}
            const request = this.pending.get(id)
            if (!request) return
            this.pending.delete(id)
            clearTimeout(request.timer)
            if (ok) request.resolve(result)
            else request.reject(new Error(error ?? 'Light client worker error'))
        }
        worker.onerror = (event) => this.destroy(new Error(`Light client worker error: ${event.message ?? 'unknown'}`))
        worker.onmessageerror = () => this.destroy(new Error('Light client worker message deserialization failed'))
        this.worker = worker

        const config = await this.buildConfig()
        await this.request('init', { config, kind: this.entry.kind }, INIT_TIMEOUT_MS)
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

    private request(type: string, payload: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
        const worker = this.worker
        if (!worker) return Promise.reject(new Error('Light client worker is not running'))
        const id = this.nextId++
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id)
                this.destroy(new Error(`Light client request '${type}' timed out after ${timeoutMs}ms`))
                reject(new Error(`Light client request '${type}' timed out`))
            }, Math.max(timeoutMs, 1))
            this.pending.set(id, { resolve, reject, timer })
            worker.postMessage({ id, type, ...payload })
        })
    }

    private destroy(err: Error): void {
        this.worker?.terminate()
        this.worker = null
        this.initPromise = null
        const pending = [...this.pending.values()]
        this.pending.clear()
        for (const request of pending) {
            clearTimeout(request.timer)
            request.reject(err)
        }
    }

    private remaining(deadline: number): number {
        return Math.max(deadline - Date.now(), 1)
    }
}

function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms))
}
