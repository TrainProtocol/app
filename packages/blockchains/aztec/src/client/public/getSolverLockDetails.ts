import { formatUnits, normalizePayoutCurveData } from '@train-protocol/sdk'
import type { LockParams, LockStatus, SolverLockDetails } from '@train-protocol/sdk'
import { getNode, parseSecret } from '../helpers'
import { readSolverLock } from './storage'

export async function getSolverLockDetails(
    params: LockParams,
    nodeUrl: string,
): Promise<SolverLockDetails | null> {
    if (!params.solverAddress) throw new Error('solverAddress is required to read a solver lock')

    const node = getNode(nodeUrl)
    const result = await readSolverLock(
        node,
        params.contractAddress,
        params.id,
        params.solverAddress,
        await node.getBlockNumber(),
    )
    return resolveSolverLock(result, params.id, params.decimals)
}

export function resolveSolverLock(result: any, id: string, decimals: number): SolverLockDetails | null {
    const status = Number(result.status) as LockStatus
    if (status === 0) return null
    if (result.payout_curve == null || result.payout_curve_data == null) {
        throw new Error('Solver lock payout policy is unavailable')
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
        reward: Number(formatUnits(BigInt(result.reward), decimals)),
        rewardTimelock: Number(result.reward_timelock),
        rewardRecipient: result.reward_recipient?.toString() ?? '',
        rewardToken: result.reward_token?.toString() ?? '',
        payoutCurve,
        payoutCurveData: normalizePayoutCurveData(result.payout_curve_data),
    }
}
