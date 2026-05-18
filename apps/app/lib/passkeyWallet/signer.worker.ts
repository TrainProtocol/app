/// <reference lib="webworker" />
import { deriveWalletSeed, IDENTITY_SALT } from '@train-protocol/auth'
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import {
    createPublicClient,
    defineChain,
    http,
    type Hex,
    type SignableMessage,
    type TypedDataDefinition,
    type Address,
} from 'viem'

declare const self: DedicatedWorkerGlobalScope

/**
 * Stateless signer worker.
 *
 * Every message carries a transferred PRF ArrayBuffer (32 bytes) from a fresh
 * WebAuthn assertion. The worker:
 *   1. Runs HKDF on the PRF to derive the wallet seed (via @train-protocol/auth,
 *      single source of truth for the HKDF info string).
 *   2. Builds the viem account from the seed.
 *   3. Verifies the derived address matches the caller-supplied expectedAddress
 *      (for every signing operation) so a user picking a different passkey at
 *      the OS prompt cannot cause the worker to sign with an unintended key.
 *   4. Zeros the PRF view AND the seed BEFORE network I/O begins, so the
 *      sensitive bytes don't sit in worker memory while RPCs are in flight.
 *   5. Performs the requested operation (sign / build+sign+broadcast).
 *
 * Note on remaining residue: viem's PrivateKeyAccount closes over the private
 * key as a JS string, which is immutable and not zeroable. That copy lives
 * until the message handler returns and GC reclaims it. The PRF/seed Uint8Arrays
 * ARE zeroed.
 */

const IDENTITY_SALT_BYTES = new TextEncoder().encode(IDENTITY_SALT)

// All bigint-shaped fields are serialized as hex strings (the EIP-1193 wire
// format). `nonce` stays a number — it's always small and decimal-friendly.
type EvmTx = {
    to?: Address
    data?: Hex
    value?: Hex
    nonce?: number
    gas?: Hex
    maxFeePerGas?: Hex
    maxPriorityFeePerGas?: Hex
}

export type SignerWorkerRequest =
    | { id: number; type: 'deriveAddress'; prf: ArrayBuffer }
    | { id: number; type: 'signMessage'; prf: ArrayBuffer; expectedAddress: Address; message: SignableMessage }
    | { id: number; type: 'signTypedData'; prf: ArrayBuffer; expectedAddress: Address; data: TypedDataDefinition }
    | {
        id: number
        type: 'sendTransaction'
        prf: ArrayBuffer
        expectedAddress: Address
        chainId: number
        rpcUrl: string
        tx: EvmTx
    }

export type SignerWorkerResponse =
    | { id: number; ok: true; address?: Address; signature?: Hex; hash?: Hex }
    | { id: number; ok: false; error: string }

function toHexKey(bytes: Uint8Array): Hex {
    return ('0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')) as Hex
}

/**
 * Derive the viem account from a transferred PRF buffer, optionally enforcing
 * an expected address. The PRF view AND derived seed are zeroed before this
 * function returns the account, so subsequent network/sign work cannot leak
 * those bytes if anything throws.
 */
function deriveAccountAndZero(prfBuffer: ArrayBuffer, expectedAddress?: Address): PrivateKeyAccount {
    const prf = new Uint8Array(prfBuffer)
    if (prf.byteLength === 0) {
        throw new Error('signer worker: PRF buffer is empty (transfer failed?)')
    }
    let seed: Uint8Array | null = null
    try {
        seed = deriveWalletSeed(prf, IDENTITY_SALT_BYTES)
        const account = privateKeyToAccount(toHexKey(seed))
        if (expectedAddress && account.address.toLowerCase() !== expectedAddress.toLowerCase()) {
            // Wrong passkey was chosen at the OS prompt. Refuse to sign.
            throw new Error('Passkey address mismatch — refusing to sign')
        }
        return account
    } finally {
        prf.fill(0)
        seed?.fill(0)
    }
}

function makeChain(chainId: number, rpcUrl: string) {
    return defineChain({
        id: chainId,
        name: `chain-${chainId}`,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
            default: { http: [rpcUrl] },
            public: { http: [rpcUrl] },
        },
    })
}

self.addEventListener('message', async (event: MessageEvent<SignerWorkerRequest>) => {
    const req = event.data
    const reply = (res: SignerWorkerResponse) => self.postMessage(res)

    try {
        switch (req.type) {
            case 'deriveAddress': {
                // Registration / bootstrap — no expected address to verify against.
                const account = deriveAccountAndZero(req.prf)
                reply({ id: req.id, ok: true, address: account.address })
                return
            }

            case 'signMessage': {
                const account = deriveAccountAndZero(req.prf, req.expectedAddress)
                const signature = await account.signMessage({ message: req.message })
                reply({ id: req.id, ok: true, signature })
                return
            }

            case 'signTypedData': {
                const account = deriveAccountAndZero(req.prf, req.expectedAddress)
                const signature = await account.signTypedData(req.data)
                reply({ id: req.id, ok: true, signature })
                return
            }

            case 'sendTransaction': {
                const account = deriveAccountAndZero(req.prf, req.expectedAddress)
                const chain = makeChain(req.chainId, req.rpcUrl)
                const publicClient = createPublicClient({ chain, transport: http(req.rpcUrl) })

                const value = req.tx.value !== undefined ? BigInt(req.tx.value) : 0n

                const [nonce, fees, gas] = await Promise.all([
                    req.tx.nonce !== undefined
                        ? Promise.resolve(req.tx.nonce)
                        : publicClient.getTransactionCount({
                            address: account.address,
                            blockTag: 'pending',
                        }),
                    publicClient.estimateFeesPerGas(),
                    req.tx.gas !== undefined
                        ? Promise.resolve(BigInt(req.tx.gas))
                        : publicClient.estimateGas({
                            account: account.address,
                            to: req.tx.to,
                            data: req.tx.data,
                            value,
                        }),
                ])

                const maxFeePerGas = req.tx.maxFeePerGas !== undefined
                    ? BigInt(req.tx.maxFeePerGas)
                    : fees.maxFeePerGas
                const maxPriorityFeePerGas = req.tx.maxPriorityFeePerGas !== undefined
                    ? BigInt(req.tx.maxPriorityFeePerGas)
                    : fees.maxPriorityFeePerGas

                if (maxFeePerGas === undefined || maxPriorityFeePerGas === undefined) {
                    throw new Error(`Chain ${req.chainId} did not return EIP-1559 fee data; legacy gas type is not yet supported by this wallet.`)
                }

                const signed = await account.signTransaction({
                    type: 'eip1559',
                    chainId: req.chainId,
                    to: req.tx.to,
                    data: req.tx.data,
                    value,
                    nonce,
                    gas,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                })

                const hash = await publicClient.sendRawTransaction({ serializedTransaction: signed })
                reply({ id: req.id, ok: true, hash })
                return
            }

            default: {
                const _exhaustive: never = req
                throw new Error(`signer worker: unknown request ${(_exhaustive as any)?.type}`)
            }
        }
    } catch (err) {
        const message = err instanceof Error
            ? ((err as any).shortMessage ?? err.message) + ((err as any).details ? ` (${(err as any).details})` : '')
            : String(err)
        reply({ id: req.id, ok: false, error: message })
    }
})

// Surface uncaught errors back to the main thread instead of dying silently.
self.addEventListener('error', (event) => {
    // The main-thread workerClient has its own `error` listener that drains pending
    // requests; we only re-post here to ensure the error string carries detail.
    try {
        self.postMessage({ id: -1, ok: false, error: `worker error: ${event.message ?? 'unknown'}` })
    } catch { /* ignore */ }
})
self.addEventListener('unhandledrejection', (event) => {
    try {
        const reason = (event as PromiseRejectionEvent).reason
        const msg = reason instanceof Error ? reason.message : String(reason)
        self.postMessage({ id: -1, ok: false, error: `worker unhandled rejection: ${msg}` })
    } catch { /* ignore */ }
})
