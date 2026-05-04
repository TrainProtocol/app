import { EventSelector, decodeFromAbi } from '@aztec/aztec.js/abi'
import { AztecAddress } from '@aztec/aztec.js/addresses'
import { type AztecNode, createAztecNodeClient } from '@aztec/aztec.js/node'
import { TxHash } from '@aztec/aztec.js/tx'
import type { EventDerivedData } from '@train-protocol/sdk'
import { bytesToHex } from '@train-protocol/sdk'
import { TrainContract } from '../artifacts/Train'
import type { AztecSigner } from '../types'

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

    await registerContractWithArtifactFallback(signer.wallet, trainInstance, TrainContract.artifact)
    const contract = TrainContract.at(aztecAtomicContract, signer.wallet)
    const userAztecAddress = AztecAddress.fromString(signer.address)

    return { contract, userAztecAddress, node }
}

// Register a contract instance with the wallet. If the local artifact's class
// id doesn't match the deployed instance, fall back to registering without the
// artifact — the wallet then fetches the artifact from the node. Local typed
// `Contract.at` wrappers still use the local artifact for call encoding, so
// this works as long as function selectors / ABI match the deployed contract.
export async function registerContractWithArtifactFallback(
    wallet: AztecSigner['wallet'],
    instance: Awaited<ReturnType<AztecNode['getContract']>>,
    artifact: any,
): Promise<void> {
    try {
        await wallet.registerContract(instance as any, artifact)
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes("doesn't match instance's current class id")) {
            await wallet.registerContract(instance as any)
            return
        }
        throw err
    }
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

            const selectorField = emittedFields[emittedFields.length - 1]
            const selector = EventSelector.fromField(selectorField)
            if (selector.toString() !== eventDef.eventSelector.toString()) continue

            const decoded = decodeFromAbi(
                [eventDef.abiType],
                log.log.fields,
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
