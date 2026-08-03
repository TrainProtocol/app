import { Provider } from 'fuels'
import {
    formatUnits,
    LockStatus,
    normalizePayoutCurveData,
} from '@train-protocol/sdk'
import type {
    LockParams,
    SolverLockDetails,
} from '@train-protocol/sdk'
import type { FuelSolverLock } from '../../types.js'
import {
    identityFromAddress,
    identityToAddress,
    mapFuelLockStatus,
    optionalContractIdToString,
    tai64ToUnixSeconds,
} from '../../utils.js'
import { buildContract } from '../helpers.js'

export async function getSolverLockDetails(
    params: LockParams,
    nodeUrl: string,
): Promise<SolverLockDetails | null> {
    if (!params.contractAddress) throw new Error('No contract address')
    if (!params.solverAddress) throw new Error('solverAddress is required to read a solver lock')

    const provider = new Provider(nodeUrl)
    const contract = buildContract(params.contractAddress, provider)
    const { value } = await contract.functions
        .get_solver_lock(params.id, identityFromAddress(params.solverAddress))
        .get()

    return value
        ? resolveSolverLock(value as FuelSolverLock, params.id, params.decimals)
        : null
}

export function resolveSolverLock(
    result: FuelSolverLock,
    id: string,
    decimals: number,
): SolverLockDetails | null {
    const sender = identityToAddress(result.sender)
    const status = mapFuelLockStatus(result.status)
    if (!sender || status === LockStatus.Empty) return null

    const amountInBaseUnits = BigInt(result.amount.toString())
    return {
        hashlock: id,
        secret: BigInt(result.secret.toString()),
        amount: Number(formatUnits(amountInBaseUnits, decimals)),
        amountInBaseUnits,
        sender,
        timelock: tai64ToUnixSeconds(result.timelock),
        status,
        recipient: identityToAddress(result.recipient),
        token: result.asset_id.bits,
        refundTo: identityToAddress(result.refund_to),
        payoutCurve: optionalContractIdToString(result.payout_curve) ?? null,
        payoutCurveData: normalizePayoutCurveData(result.payout_curve_data ?? new Uint8Array()),
        reward: Number(formatUnits(BigInt(result.reward.toString()), decimals)),
        rewardToken: result.reward_asset_id.bits,
        rewardRecipient: identityToAddress(result.reward_recipient),
        rewardTimelock: tai64ToUnixSeconds(result.reward_timelock),
    }
}
