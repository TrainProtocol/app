import { AbiFunction } from 'ox'
import { LockStatus, formatUnits } from '@train-protocol/sdk'
import type { LockParams, SolverLockDetails } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import { TronRpcClient } from '../../rpc.js'
import { ZERO_ADDRESS, FUNCTION_SIGNATURES } from '../../constants.js'
import { toTronHex } from '../../address.js'
import { encodeParams, hex, normalizeAddresses, normalizeAddress } from '../../utils.js'

export async function getSolverLockDetails(
    params: LockParams,
    nodeUrl: string,
    apiKey?: string,
): Promise<SolverLockDetails | null> {
    const { id, contractAddress } = params
    const rpc = new TronRpcClient(nodeUrl, apiKey)

    const contractHex = toTronHex(contractAddress)
    const dummyOwner = contractHex

    const countCalldata = AbiFunction.encodeData(htlcFunctions.getSolverLockCount, [hex(id)])
    const countParam = encodeParams(countCalldata)
    const countRaw = await rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.getSolverLockCount, countParam, dummyOwner)
    const count = Number(AbiFunction.decodeResult(htlcFunctions.getSolverLockCount, hex('0x' + countRaw)))

    if (count === 0) return null

    for (let i = 1; i <= count; i++) {
        const result = await getSolverLockByIndex(params, i, rpc)
        if (!result) continue
        if (params.solverAddress && normalizeAddress(result.sender ?? '').toLowerCase() !== normalizeAddress(params.solverAddress).toLowerCase()) continue
        return result
    }

    return null
}

async function getSolverLockByIndex(
    params: LockParams,
    index: number,
    rpc: TronRpcClient,
): Promise<SolverLockDetails | null> {
    const { id, contractAddress } = params
    const contractHex = toTronHex(contractAddress)
    const dummyOwner = contractHex

    const calldata = AbiFunction.encodeData(htlcFunctions.getSolverLock, [hex(id), BigInt(index)])
    const parameter = encodeParams(calldata)
    const raw = await rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.getSolverLock, parameter, dummyOwner)
    const result = AbiFunction.decodeResult(htlcFunctions.getSolverLock, hex('0x' + raw)) as any

    if (result.sender === ZERO_ADDRESS) return null

    return {
        ...normalizeAddresses(result),
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
        secret: BigInt(result.secret),
        timelock: Number(result.timelock),
        status: Number(result.status) as LockStatus,
        index,
    }
}
