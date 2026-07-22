import { AztecAddress } from '@aztec/aztec.js/addresses'
import { getPublicEvents } from '@aztec/aztec.js/events'
import type { AztecNode } from '@aztec/aztec.js/node'
import { TxHash } from '@aztec/aztec.js/tx'
import { bytesToHex } from '@train-protocol/sdk'
import type { Network, UserLockDetails } from '@train-protocol/sdk'
import { TrainContract, type UserLocked } from '../../artifacts/Train'
import { getUserLockDetails } from './getUserLockDetails'

export async function recoverSwap(
    node: AztecNode,
    txHash: string,
    network: Network,
): Promise<UserLockDetails> {
    if (!/^0x[a-fA-F0-9]{1,64}$/.test(txHash))
        throw new Error('Invalid transaction hash format')

    const parsedTxHash = TxHash.fromString(txHash)
    const contractAddress = AztecAddress.fromStringUnsafe(network.trainContract)
    const { events } = await getPublicEvents<UserLocked>(
        node,
        TrainContract.events.UserLocked,
        { contractAddress, txHash: parsedTxHash },
    )

    if (!events.length) {
        const txEffect = await node.getTxEffect(parsedTxHash)
        if (!txEffect) throw new Error('Transaction not found')
        throw new Error('This transaction does not contain a swap lock')
    }

    const { event } = events[0]
    const eventHashlock = bytesToHex(Array.from(event.hashlock).map(Number))
    const eventToken = event.token.toString()

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
