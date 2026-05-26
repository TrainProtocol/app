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

export async function getContractInstance(
    contractAddress: string,
    signer: AztecSigner,
    nodeOrUrl: AztecNode | string,
) {
    const aztecAtomicContract = AztecAddress.fromString(contractAddress)
    const node = typeof nodeOrUrl === 'string' ? createAztecNodeClient(nodeOrUrl) : nodeOrUrl
    const trainInstance = await node.getContract(aztecAtomicContract)

    if (!trainInstance) throw new Error('Train contract not found')

    await signer.wallet.registerContract(trainInstance, TrainContract.artifact)
    const contract = TrainContract.at(aztecAtomicContract, signer.wallet)
    const userAztecAddress = AztecAddress.fromString(signer.address)

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
        const { logs } = await node.getPublicLogs({
            txHash: TxHash.fromString(txHash),
        })

        const eventDef = TrainContract.events.UserLocked

        const aztecBytesToString = (bytes: (bigint | number)[]) =>
            new TextDecoder().decode(new Uint8Array(bytes.map(Number))).replace(/\0/g, '').trim()

        for (const log of logs) {
            const emittedFields = log.log.getEmittedFields()
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
