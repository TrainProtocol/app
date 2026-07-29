import { Provider } from 'fuels'
import {
    formatUnits,
    LockStatus,
} from '@train-protocol/sdk'
import type {
    LockParams,
    SolverLockDetails,
} from '@train-protocol/sdk'
import type { FuelSolverLock } from '../../types.js'
import {
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

    const provider = new Provider(nodeUrl)
    const contract = buildContract(params.contractAddress, provider)
    const { value: countValue } = await contract.functions.get_solver_lock_count(params.id).get()
    const count = Number(countValue)

    for (let index = 1; index <= count; index += 1) {
        const lock = await getSolverLockByIndex(contract, params, index)
        if (!lock) continue
        if (params.solverAddress &&
            lock.sender.toLowerCase() !== params.solverAddress.toLowerCase()) continue
        return lock
    }

    return null
}

async function getSolverLockByIndex(
    contract: ReturnType<typeof buildContract>,
    params: LockParams,
    index: number,
): Promise<SolverLockDetails | null> {
    const { value } = await contract.functions.get_solver_lock(params.id, index).get()
    return value
        ? resolveSolverLock(value as FuelSolverLock, params.id, params.decimals, index)
        : null
}

export function resolveSolverLock(
    result: FuelSolverLock,
    id: string,
    decimals: number,
    index: number,
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
        payoutCurve: optionalContractIdToString(result.payout_curve),
        reward: Number(formatUnits(BigInt(result.reward.toString()), decimals)),
        rewardToken: result.reward_asset_id.bits,
        rewardRecipient: identityToAddress(result.reward_recipient),
        rewardTimelock: tai64ToUnixSeconds(result.reward_timelock),
        index,
    }
}
