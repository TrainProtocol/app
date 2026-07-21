import { EventSelector, decodeFromAbi } from '@aztec/aztec.js/abi'
import type { AztecNode } from '@aztec/aztec.js/node'
import { TxHash } from '@aztec/aztec.js/tx'
import { bytesToHex } from '@train-protocol/sdk'
import type { Network, UserLockDetails } from '@train-protocol/sdk'
import { TrainContract } from '../../artifacts/Train'
import { getUserLockDetails } from './getUserLockDetails'

export async function recoverSwap(
    node: AztecNode,
    txHash: string,
    network: Network,
): Promise<UserLockDetails> {
    if (!/^0x[a-fA-F0-9]{1,64}$/.test(txHash))
        throw new Error('Invalid transaction hash format')

    const txEffect = await node.getTxEffect(TxHash.fromString(txHash))
    const logs = txEffect?.data.publicLogs ?? []

    if (!logs.length) throw new Error('Transaction not found')

    const eventDef = TrainContract.events.UserLocked

    for (const log of logs) {
        const emittedFields = log.getEmittedFields()
        if (emittedFields.length === 0) continue

        const selectorField = emittedFields[emittedFields.length - 1]
        const selector = EventSelector.fromField(selectorField)
        if (selector.toString() !== eventDef.eventSelector.toString()) continue

        const decoded = decodeFromAbi(
            [eventDef.abiType],
            log.fields,
        ) as Record<string, any>

        const eventHashlock = bytesToHex(Array.from(decoded.hashlock).map(Number))
        const eventToken = decoded.token.toString()

        const token = network.tokens.find(t => t.contract?.toLowerCase() === eventToken.toLowerCase())
        const decimals = token?.decimals ?? 18

        const result = await getUserLockDetails(node, {
            id: eventHashlock,
            contractAddress: network.trainContract,
            decimals,
            txId: txHash,
            chainId: network.chainId,
        })

        if (!result) throw new Error('Lock not found for recovered hashlock')

        return result
    }

    throw new Error('This transaction does not contain a swap lock')
}
