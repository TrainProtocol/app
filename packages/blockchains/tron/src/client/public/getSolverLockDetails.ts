import { AbiFunction } from 'ox'
import { LockStatus, formatUnits, normalizePayoutCurveData } from '@train-protocol/sdk'
import type { LockParams, SolverLockDetails } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import { TronRpcClient } from '../../rpc.js'
import { ZERO_ADDRESS, FUNCTION_SIGNATURES } from '../../constants.js'
import { toEvmHex, toTronHex } from '../../address.js'
import { encodeParams, hex, normalizeAddress } from '../../utils.js'

export async function getSolverLockDetails(
    params: LockParams,
    nodeUrl: string,
    apiKey?: string,
): Promise<SolverLockDetails | null> {
    const { id, contractAddress, solverAddress } = params
    if (!solverAddress) throw new Error('solverAddress is required to read a solver lock')

    const rpc = new TronRpcClient(nodeUrl, apiKey)

    const contractHex = toTronHex(contractAddress)
    const dummyOwner = contractHex

    const calldata = AbiFunction.encodeData(htlcFunctions.getSolverLock, [hex(id), toEvmHex(solverAddress)])
    const parameter = encodeParams(calldata)
    const raw = await rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.getSolverLock, parameter, dummyOwner)
    const result = AbiFunction.decodeResult(htlcFunctions.getSolverLock, hex('0x' + raw)) as any

    return resolveSolverLock(result, id, params.decimals)
}

export function resolveSolverLock(result: any, id: string, decimals: number): SolverLockDetails | null {
    if (result.sender === ZERO_ADDRESS) return null

    // Tron's ABI predates the payout fields: '' = unavailable, null = no curve (pays in full).
    const decodedPayoutCurve = result.payoutCurve == null ? null : normalizeAddress(result.payoutCurve)
    const payoutCurve = decodedPayoutCurve === null
        ? ''
        : decodedPayoutCurve.toLowerCase() === ZERO_ADDRESS ? null : decodedPayoutCurve

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), decimals)),
        amountInBaseUnits: BigInt(result.amount),
        secret: BigInt(result.secret),
        sender: normalizeAddress(result.sender),
        recipient: normalizeAddress(result.recipient),
        token: normalizeAddress(result.token),
        timelock: Number(result.timelock),
        status: Number(result.status) as LockStatus,
        reward: Number(result.reward),
        rewardTimelock: Number(result.rewardTimelock),
        rewardRecipient: normalizeAddress(result.rewardRecipient),
        rewardToken: normalizeAddress(result.rewardToken),
        payoutCurve,
        payoutCurveData: result.payoutCurveData == null ? '0x' : normalizePayoutCurveData(result.payoutCurveData),
    }
}
