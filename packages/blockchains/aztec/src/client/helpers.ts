import { AztecAddress } from '@aztec/aztec.js/addresses'
import { getPublicEvents } from '@aztec/aztec.js/events'
import { type AztecNode, createAztecNodeClient } from '@aztec/aztec.js/node'
import { TxHash } from '@aztec/aztec.js/tx'
import type { EventDerivedData } from '@train-protocol/sdk'
import { bytesToHex } from '@train-protocol/sdk'
import { TrainContract, type UserLocked } from '../artifacts/Train'
import type { AztecSigner } from '../types'

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
 *
 * Some extension wallets also validate the provided artifact against the
 * instance's current class id ("Contract artifact doesn't match instance's
 * current class id"). The artifact parameter is optional in the wallet RPC —
 * the wallet resolves the class from its own storage or the chain — so on any
 * other registration failure we retry with the instance alone before giving up.
 */
export async function registerContractCompat(
    wallet: AztecSigner['wallet'],
    ...args: RegisterContractArgs
): Promise<void> {
    const [instance, artifact] = args
    const address = (instance as { address?: { toString(): string } }).address?.toString()
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
            if (isLegacyRegisterContractReturn(error)) return
            if (!artifact) throw error
            console.warn(
                `[registerContractCompat] artifact registration failed for ${address}; ` +
                'retrying instance-only (wallet will lack the artifact for this class):',
                error,
            )
            try {
                await wallet.registerContract(instance)
            } catch (retryError) {
                if (!isLegacyRegisterContractReturn(retryError)) throw error
            }
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
    contractAddress: string,
    hashlock: string,
): Promise<Partial<EventDerivedData>> {
    try {
        const { events } = await getPublicEvents<UserLocked>(
            node,
            TrainContract.events.UserLocked,
            {
                contractAddress: AztecAddress.fromStringUnsafe(contractAddress),
                txHash: TxHash.fromString(txHash),
            },
        )

        const aztecBytesToString = (bytes: (bigint | number)[]) =>
            new TextDecoder().decode(new Uint8Array(bytes.map(Number))).replace(/\0/g, '').trim()

        for (const { event: decoded } of events) {
            const decodedHashlock = bytesToHex(Array.from(decoded.hashlock).map(Number))
            if (decodedHashlock.toLowerCase() !== hashlock.toLowerCase()) continue

            const data: Partial<EventDerivedData> = {}

            if (decoded.dst_chain) data.dstChain = aztecBytesToString(decoded.dst_chain)
            if (decoded.dst_address) data.dstAddress = aztecBytesToString(decoded.dst_address)
            if (decoded.dst_amount != null) data.dstAmount = BigInt(decoded.dst_amount)
            if (decoded.dst_token) data.dstToken = aztecBytesToString(decoded.dst_token)
            if (decoded.user_data) {
                data.userData = aztecBytesToString(decoded.user_data) || undefined
            }
            if (decoded.solver_data) {
                data.solverData = aztecBytesToString(decoded.solver_data) || undefined
            }

            return data
        }
    } catch (e) {
        console.error('Error fetching event data from Aztec logs:', e)
    }
    return {}
}
