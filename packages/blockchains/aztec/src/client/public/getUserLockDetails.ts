import type { AztecNode } from '@aztec/aztec.js/node'
import { formatUnits, normalizePayoutCurveData } from '@train-protocol/sdk'
import type { LockParams, LockStatus, UserLockDetails, EventDerivedData, BaseLockDetails } from '@train-protocol/sdk'
import {
    findEventDataFromLogs,
    parseSecret,
} from '../helpers'
import { readUserLock } from './storage'

export async function getUserLockDetails(
    node: AztecNode,
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
        eventDerivedData = await findEventDataFromLogs(node, txId, contractAddress, id)
    }

    return { ...parsedResult, ...eventDerivedData }
}

export function resolveUserLock(result: any, id: string, decimals: number): BaseLockDetails | null {
    const status = Number(result.status) as LockStatus
    if (status === 0) return null

    if (result.payout_curve == null || result.payout_curve_data == null) {
        throw new Error('User lock payout policy is unavailable')
    }

    const rawPayoutCurve = result.payout_curve.toString()
    const payoutCurve = BigInt(rawPayoutCurve) === 0n ? null : rawPayoutCurve

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), decimals)),
        amountInBaseUnits: BigInt(result.amount),
        secret: parseSecret(result.secret),
        timelock: Number(result.timelock),
        status,
        sender: result.sender?.toString() ?? result.refund_to?.toString() ?? '',
        recipient: result.recipient?.toString() ?? '',
        token: result.token?.toString() ?? '',
        refundTo: result.refund_to?.toString() ?? '',
        payoutCurve,
        payoutCurveData: normalizePayoutCurveData(result.payout_curve_data),
    }
}
