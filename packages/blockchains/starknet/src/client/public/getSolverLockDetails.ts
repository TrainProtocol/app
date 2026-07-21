import { cairo, RpcProvider } from 'starknet'
import { formatUnits } from '@train-protocol/sdk'
import type { LockParams, SolverLockDetails } from '@train-protocol/sdk'
import { formatStarknetAddress } from '../../utils.js'
import { createContract, mapLockStatus } from '../helpers.js'

export async function getSolverLockDetails(
    params: LockParams,
    nodeUrl: string,
): Promise<SolverLockDetails | null> {
    const { id, contractAddress } = params
    const provider = new RpcProvider({ nodeUrl })
    const contract = createContract(contractAddress, provider)

    const count = Number(await contract.get_solver_lock_count(cairo.uint256(BigInt(id))))
    if (count === 0) return null

    for (let i = 1; i <= count; i++) {
        const result = await getSolverLockByIndex(params, i, nodeUrl)
        if (!result) continue
        if (params.solverAddress && formatStarknetAddress(result.sender ?? '').toLowerCase() !== formatStarknetAddress(params.solverAddress).toLowerCase()) continue
        return result
    }

    return null
}

export async function getSolverLockByIndex(
    params: LockParams,
    index: number,
    nodeUrl: string,
): Promise<SolverLockDetails | null> {
    const { id, contractAddress } = params
    const provider = new RpcProvider({ nodeUrl })
    const contract = createContract(contractAddress, provider)

    const result = await contract.get_solver_lock(cairo.uint256(BigInt(id)), cairo.uint256(BigInt(index)))

    return resolveSolverLock(result, id, params.decimals, index)
}

export function resolveSolverLock(result: any, id: string, decimals: number, index: number): SolverLockDetails | null {
    if (BigInt(result.sender) === 0n) return null

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
        index,
    }
}
