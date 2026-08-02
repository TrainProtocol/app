import { cairo, RpcProvider } from 'starknet'
import { formatUnits, normalizePayoutCurveData } from '@train-protocol/sdk'
import type { LockParams, SolverLockDetails } from '@train-protocol/sdk'
import { formatStarknetAddress } from '../../utils.js'
import { createContract, mapLockStatus } from '../helpers.js'

export async function getSolverLockDetails(
    params: LockParams,
    nodeUrl: string,
): Promise<SolverLockDetails | null> {
    const { id, contractAddress, solverAddress } = params
    if (!solverAddress) throw new Error('solverAddress is required to read a solver lock')

    const provider = new RpcProvider({ nodeUrl })
    const contract = createContract(contractAddress, provider)

    const result = await contract.get_solver_lock(cairo.uint256(BigInt(id)), solverAddress)

    return resolveSolverLock(result, id, params.decimals)
}

export function resolveSolverLock(result: any, id: string, decimals: number): SolverLockDetails | null {
    if (BigInt(result.sender) === 0n) return null
    if (result.payout_curve == null || result.payout_curve_data == null) {
        throw new Error('Solver lock payout policy is unavailable')
    }

    const payoutCurve = BigInt(result.payout_curve) === 0n
        ? null
        : formatStarknetAddress(result.payout_curve).toString()

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), decimals)),
        amountInBaseUnits: BigInt(result.amount),
        secret: BigInt(result.secret),
        sender: formatStarknetAddress(result.sender).toString(),
        recipient: formatStarknetAddress(result.recipient).toString(),
        token: formatStarknetAddress(result.token).toString(),
        timelock: Number(result.timelock),
        status: mapLockStatus(result.status),
        reward: Number(formatUnits(BigInt(result.reward), decimals)),
        rewardTimelock: Number(result.reward_timelock),
        rewardRecipient: formatStarknetAddress(result.reward_recipient).toString(),
        rewardToken: formatStarknetAddress(result.reward_token).toString(),
        payoutCurve,
        payoutCurveData: normalizePayoutCurveData(result.payout_curve_data),
    }
}
