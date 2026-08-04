import { AbiFunction } from 'ox'
import type { LockParams, SolverLockDetails } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import { JsonRpcClient } from '../../rpc.js'
import { hex, type Hex } from '../../utils.js'
import { LockStatus, formatUnits, normalizePayoutCurveData } from '@train-protocol/sdk'
import { ZERO_ADDRESS } from '../../constants.js'

export async function getSolverLockDetails(
    params: LockParams,
    nodeUrl: string,
): Promise<SolverLockDetails | null> {
    const { id, contractAddress, solverAddress } = params
    if (!solverAddress) throw new Error('solverAddress is required to read a solver lock')

    const rpc = new JsonRpcClient(nodeUrl)
    const lockRaw = await rpc.ethCall(contractAddress, encodeGetSolverLockData(id, solverAddress))
    return decodeGetSolverLockResult(lockRaw, id, params.decimals)
}

/** Calldata for `getSolverLock(bytes32 hashlock, address solver)`. */
export function encodeGetSolverLockData(id: string, solverAddress: string): Hex {
    return AbiFunction.encodeData(htlcFunctions.getSolverLock, [hex(id), solverAddress])
}

/** Decode a raw `eth_call` result and map it; null when the lock slot is empty (zero sender). */
export function decodeGetSolverLockResult(raw: string, id: string, decimals: number): SolverLockDetails | null {
    const result = AbiFunction.decodeResult(htlcFunctions.getSolverLock, hex(raw)) as any
    return resolveSolverLock(result, id, decimals)
}

export function resolveSolverLock(result: any, id: string, decimals: number): SolverLockDetails | null {
    if (result.sender === ZERO_ADDRESS) return null
    if (result.payoutCurve == null || result.payoutCurveData == null) {
        throw new Error('Solver lock payout policy is unavailable')
    }

    const payoutCurve = String(result.payoutCurve)

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
        payoutCurve: payoutCurve.toLowerCase() === ZERO_ADDRESS ? null : payoutCurve,
        payoutCurveData: normalizePayoutCurveData(result.payoutCurveData),
    }
}
