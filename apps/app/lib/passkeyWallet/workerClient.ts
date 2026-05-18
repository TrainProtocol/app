import { toHex } from 'viem'
import type {
    Hex,
    SignableMessage,
    TypedDataDefinition,
    Address,
} from 'viem'
import type { SignerWorkerRequest, SignerWorkerResponse } from './signer.worker'

const bigintToHex = (v: bigint | undefined): Hex | undefined =>
    v !== undefined ? toHex(v) : undefined

let worker: Worker | null = null
let nextId = 1
type Pending = { id: number; type: SignerWorkerRequest['type']; reject: (err: Error) => void; resolve: (res: SignerWorkerResponse) => void }
const pending = new Map<number, Pending>()

function rejectAllPending(message: string) {
    if (pending.size === 0) return
    for (const [, handler] of pending) {
        handler.reject(new Error(`${message} (in-flight: ${handler.type}#${handler.id})`))
    }
    pending.clear()
}

function ensureWorker(): Worker {
    if (worker) return worker
    if (typeof window === 'undefined') {
        throw new Error('passkey-wallet worker can only run in the browser')
    }
    const w = new Worker(new URL('./signer.worker.ts', import.meta.url), { type: 'module' })
    w.addEventListener('message', (event: MessageEvent<SignerWorkerResponse>) => {
        const handler = pending.get(event.data.id)
        if (!handler) return
        pending.delete(event.data.id)
        handler.resolve(event.data)
    })
    w.addEventListener('error', (event) => {
        // Reject all pending, null the worker so the next call recreates it.
        rejectAllPending(`passkey-wallet worker error: ${event.message ?? 'unknown'}`)
        if (worker === w) {
            try { w.terminate() } catch { /* ignore */ }
            worker = null
        }
    })
    worker = w
    return w
}

function send(
    req: SignerWorkerRequest,
    transfer: Transferable[] = [],
): Promise<SignerWorkerResponse> {
    const w = ensureWorker()
    return new Promise<SignerWorkerResponse>((resolve, reject) => {
        pending.set(req.id, { id: req.id, type: req.type, resolve, reject })
        try {
            w.postMessage(req, transfer)
        } catch (err) {
            pending.delete(req.id)
            reject(err instanceof Error ? err : new Error(String(err)))
        }
    })
}

async function call<T>(
    req: SignerWorkerRequest,
    transfer: Transferable[],
    pick: (res: Extract<SignerWorkerResponse, { ok: true }>) => T,
): Promise<T> {
    const res = await send(req, transfer)
    if (!res.ok) throw new Error(res.error)
    return pick(res)
}

/**
 * Every method takes a freshly-derived PRF ArrayBuffer (from a fresh passkey
 * assertion). The buffer is transferred (detached from the main thread). The
 * worker derives the wallet seed via HKDF inside its own scope, performs the
 * operation, and zeros both the PRF view and the seed before any network I/O.
 *
 * Signing methods accept an `expectedAddress`. The worker derives the address
 * from the PRF, compares it to `expectedAddress`, and aborts on mismatch — so
 * a user picking a different passkey at the OS prompt cannot cause a sign with
 * an unintended key.
 *
 * For sendTransaction the worker also builds the tx (nonce/gas/fees) and
 * broadcasts via its own viem PublicClient — the main thread sees only the
 * resulting tx hash.
 */
export const passkeyWalletWorker = {
    async deriveAddress(prf: ArrayBuffer): Promise<Address> {
        const id = nextId++
        if (prf.byteLength === 0) throw new Error('deriveAddress: PRF buffer already detached')
        return call({ id, type: 'deriveAddress', prf }, [prf], (res) => {
            if (!res.address) throw new Error('deriveAddress: missing address')
            return res.address
        })
    },

    async signMessage(prf: ArrayBuffer, expectedAddress: Address, message: SignableMessage): Promise<Hex> {
        const id = nextId++
        if (prf.byteLength === 0) throw new Error('signMessage: PRF buffer already detached')
        return call(
            { id, type: 'signMessage', prf, expectedAddress, message },
            [prf],
            (res) => {
                if (!res.signature) throw new Error('signMessage: missing signature')
                return res.signature
            },
        )
    },

    async signTypedData(prf: ArrayBuffer, expectedAddress: Address, data: TypedDataDefinition): Promise<Hex> {
        const id = nextId++
        if (prf.byteLength === 0) throw new Error('signTypedData: PRF buffer already detached')
        return call(
            { id, type: 'signTypedData', prf, expectedAddress, data },
            [prf],
            (res) => {
                if (!res.signature) throw new Error('signTypedData: missing signature')
                return res.signature
            },
        )
    },

    /**
     * Build, sign, and broadcast an EIP-1559 transaction entirely inside the worker.
     * Returns the tx hash. The main thread provides only an RPC URL and the call
     * params (to/data/value); the worker fetches nonce/gas/fees itself.
     */
    async sendTransaction(
        prf: ArrayBuffer,
        expectedAddress: Address,
        params: {
            chainId: number
            rpcUrl: string
            to?: Address
            data?: Hex
            value?: bigint
            nonce?: number
            gas?: bigint
            maxFeePerGas?: bigint
            maxPriorityFeePerGas?: bigint
        },
    ): Promise<Hex> {
        const id = nextId++
        if (prf.byteLength === 0) throw new Error('sendTransaction: PRF buffer already detached')
        const tx = {
            to: params.to,
            data: params.data,
            nonce: params.nonce,
            value: bigintToHex(params.value),
            gas: bigintToHex(params.gas),
            maxFeePerGas: bigintToHex(params.maxFeePerGas),
            maxPriorityFeePerGas: bigintToHex(params.maxPriorityFeePerGas),
        }
        return call(
            { id, type: 'sendTransaction', prf, expectedAddress, chainId: params.chainId, rpcUrl: params.rpcUrl, tx },
            [prf],
            (res) => {
                if (!res.hash) throw new Error('sendTransaction: missing hash')
                return res.hash
            },
        )
    },

    /** Terminate the worker. Pending callers are rejected with a clear error. */
    async clear(): Promise<void> {
        rejectAllPending('passkey-wallet worker terminated')
        if (!worker) return
        try { worker.terminate() } catch { /* ignore */ }
        worker = null
    },
}
