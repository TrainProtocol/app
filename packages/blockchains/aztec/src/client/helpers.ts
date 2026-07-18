import { decodeFromAbi } from '@aztec/aztec.js/abi'
import { AztecAddress } from '@aztec/aztec.js/addresses'
import { type AztecNode, createAztecNodeClient } from '@aztec/aztec.js/node'
import { TxHash } from '@aztec/aztec.js/tx'
import type { EventDerivedData } from '@train-protocol/sdk'
import { bytesToHex } from '@train-protocol/sdk'
import { TrainContract } from '../artifacts/Train'
import type { AztecSigner } from '../types'

// Train contract emits via `emit_public_log_unsafe(tag, struct)`, so the first
// emitted field is the event tag and there is no selector at the end.
const EVENT_USER_LOCKED_TAG = 1n

export function requireSigner(signer?: AztecSigner): AztecSigner {
    if (!signer) throw new Error('Signer required')
    return signer
}

export function getNode(rpcUrl: string, cachedNode?: AztecNode): AztecNode {
    if (cachedNode) return cachedNode
    return createAztecNodeClient(rpcUrl)
}

type RegisterContractArgs = Parameters<AztecSigner['wallet']['registerContract']>
const contractRegistrations = new WeakMap<
    AztecSigner['wallet'],
    Map<string, Promise<void>>
>()

function isLegacyRegisterContractReturn(error: unknown): boolean {
    if (typeof error !== 'object' || error === null ||
        (error as { name?: unknown }).name !== 'ZodError') return false

    const issues = (error as {
        issues?: Array<{ code?: unknown; expected?: unknown; path?: unknown }>
    }).issues

    return Array.isArray(issues) && issues.length > 0 && issues.every(issue =>
        issue.code === 'invalid_type' &&
        issue.expected === 'void' &&
        Array.isArray(issue.path) &&
        issue.path.length === 0,
    )
}

/**
 * Aztec v5 changed registerContract's return type from the registered instance
 * to void. Older extension wallets still return the instance after successfully
 * registering it, which the v5 wallet client rejects during response validation.
 */
export async function registerContractCompat(
    wallet: AztecSigner['wallet'],
    ...args: RegisterContractArgs
): Promise<void> {
    const address = (args[0] as { address?: { toString(): string } }).address?.toString()
    const registrations = contractRegistrations.get(wallet) ?? new Map<string, Promise<void>>()
    if (!contractRegistrations.has(wallet)) contractRegistrations.set(wallet, registrations)

    if (address) {
        const existing = registrations.get(address)
        if (existing) return existing
    }

    const registration = (async () => {
        try {
            await wallet.registerContract(...args)
        } catch (error) {
            if (!isLegacyRegisterContractReturn(error)) throw error
        }
    })()

    if (address) registrations.set(address, registration)

    try {
        await registration
    } catch (error) {
        if (address) registrations.delete(address)
        throw error
    }
}

export async function getContractInstance(
    contractAddress: string,
    signer: AztecSigner,
    nodeOrUrl: AztecNode | string,
) {
    const aztecAtomicContract = AztecAddress.fromStringUnsafe(contractAddress)
    const node = typeof nodeOrUrl === 'string' ? createAztecNodeClient(nodeOrUrl) : nodeOrUrl
    const trainInstance = await node.getContract(aztecAtomicContract)

    if (!trainInstance) throw new Error('Train contract not found')

    await registerContractCompat(signer.wallet, trainInstance, TrainContract.artifact)
    const contract = TrainContract.at(aztecAtomicContract, signer.wallet)
    const userAztecAddress = AztecAddress.fromStringUnsafe(signer.address)

    return { contract, userAztecAddress, node }
}

export function parseSecret(rawSecret: unknown): bigint {
    const secretBytes: number[] = Array.from((rawSecret as number[]) || [])
    const secretHex = secretBytes.length > 0 ? bytesToHex(secretBytes) : '0x0'
    return BigInt(secretHex)
}

export function strToBytes(str: string, length: number): number[] {
    const bytes = new TextEncoder().encode(str);
    const result = new Array<number>(length).fill(0);
    for (let i = 0; i < Math.min(bytes.length, length); i++) {
        result[i] = bytes[i];
    }
    return result;
}

export async function findEventDataFromLogs(
    node: AztecNode,
    txHash: string,
    hashlock: string,
): Promise<Partial<EventDerivedData>> {
    try {
        const txEffect = await node.getTxEffect(TxHash.fromString(txHash))
        const logs = txEffect?.data.publicLogs ?? []

        const eventDef = TrainContract.events.UserLocked

        const aztecBytesToString = (bytes: (bigint | number)[]) =>
            new TextDecoder().decode(new Uint8Array(bytes.map(Number))).replace(/\0/g, '').trim()

        for (const log of logs) {
            const emittedFields = log.getEmittedFields()
            if (emittedFields.length === 0) continue

            // First field is the event tag; skip non-UserLocked logs
            if (emittedFields[0].toBigInt() !== EVENT_USER_LOCKED_TAG) continue

            const decoded = decodeFromAbi(
                [eventDef.abiType],
                emittedFields.slice(1),
            ) as Record<string, any>

            const decodedHashlock = bytesToHex(Array.from(decoded.hashlock).map(Number))
            if (decodedHashlock.toLowerCase() !== hashlock.toLowerCase()) continue

            const data: Partial<EventDerivedData> = {}

            if (decoded.dst_chain) data.dstChain = aztecBytesToString(decoded.dst_chain)
            if (decoded.dst_address) data.dstAddress = aztecBytesToString(decoded.dst_address)
            if (decoded.dst_amount != null) data.dstAmount = BigInt(decoded.dst_amount)
            if (decoded.dst_token) data.dstToken = aztecBytesToString(decoded.dst_token)
            if (decoded.userData) {
                data.userData = aztecBytesToString(decoded.userData) || undefined
            }
            if (decoded.solverData) {
                data.solverData = aztecBytesToString(decoded.solverData) || undefined
            }

            return data
        }
    } catch (e) {
        console.error('Error fetching event data from Aztec logs:', e)
    }
    return {}
}
