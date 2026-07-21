import { AbiFunction } from 'ox'
import type { LockParams, SolverLockDetails } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import { JsonRpcClient } from '../../rpc.js'
import { hex } from '../../utils.js'
import { LockStatus, formatUnits } from '@train-protocol/sdk'
import { ZERO_ADDRESS } from '../../constants.js'

export async function getSolverLockDetails(
    params: LockParams,
    nodeUrl: string,
): Promise<SolverLockDetails | null> {
    const { id, contractAddress } = params
    const rpc = new JsonRpcClient(nodeUrl)

    const countData = AbiFunction.encodeData(htlcFunctions.getSolverLockCount, [hex(id)])
    const countRaw = await rpc.ethCall(contractAddress, countData)
    const count = Number(AbiFunction.decodeResult(htlcFunctions.getSolverLockCount, hex(countRaw)))

    if (count === 0) return null

    for (let i = 1; i <= count; i++) {
        const result = await getSolverLockByIndex(params, i, nodeUrl)
        if (!result) continue
        if (params.solverAddress && result.sender?.toLowerCase() !== params.solverAddress.toLowerCase()) continue
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
    const rpc = new JsonRpcClient(nodeUrl)

    const lockData = AbiFunction.encodeData(htlcFunctions.getSolverLock, [hex(id), BigInt(index)])
    const lockRaw = await rpc.ethCall(contractAddress, lockData)
    const result = AbiFunction.decodeResult(htlcFunctions.getSolverLock, hex(lockRaw)) as any

    return resolveSolverLock(result, id, params.decimals, index)
}

export function resolveSolverLock(result: any, id: string, decimals: number, index: number): SolverLockDetails | null {
    if (result.sender === ZERO_ADDRESS) return null

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), decimals)),
        amountInBaseUnits: BigInt(result.amount),
        secret: BigInt(result.secret),
        sender: result.sender,
        recipient: result.recipient,
        token: result.token,
        timelock: Number(result.timelock),
        status: Number(result.status) as LockStatus,
        reward: Number(result.reward),
        rewardTimelock: Number(result.rewardTimelock),
        rewardRecipient: result.rewardRecipient,
        rewardToken: result.rewardToken,
        index,
    }
}
