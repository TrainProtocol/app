import type { AztecNode } from '@aztec/aztec.js/node'
import { formatUnits } from '@train-protocol/sdk'
import type { LockParams, LockStatus, UserLockDetails, EventDerivedData, BaseLockDetails } from '@train-protocol/sdk'
import type { AztecSigner } from '../../types'
import {
    findEventDataFromLogs,
    parseSecret,
} from '../helpers'
import { readUserLock } from './storage'

export async function getUserLockDetails(
    _rpcUrl: string,
    node: AztecNode,
    _signer: AztecSigner | undefined,
    params: LockParams,
): Promise<UserLockDetails | null> {
    const { id, contractAddress, txId } = params
    const result = await readUserLock(
        node,
        contractAddress,
        id,
        await node.getBlockNumber(),
    )
    const parsedResult = resolveUserLock(result, id, params.decimals)
    if (!parsedResult) return null

    let eventDerivedData = {} as Partial<EventDerivedData>
    if (txId) {
        eventDerivedData = await findEventDataFromLogs(node, txId, id)
    }

    return { ...parsedResult, ...eventDerivedData }
}

export function resolveUserLock(result: any, id: string, decimals: number): BaseLockDetails | null {
    const status = Number(result.status) as LockStatus
    if (status === 0) return null

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), decimals)),
        secret: parseSecret(result.secret),
        timelock: Number(result.timelock),
        status,
        sender: result.sender?.toString() ?? result.refund_to?.toString() ?? '',
        recipient: result.recipient?.toString() ?? '',
        token: result.token?.toString() ?? '',
    }
}
