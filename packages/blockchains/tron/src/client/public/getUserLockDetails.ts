import { AbiFunction } from 'ox'
import { LockStatus, formatUnits } from '@train-protocol/sdk'
import type { LockParams, UserLockDetails, EventDerivedData, BaseLockDetails } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { TronRpcClient } from '../../rpc.js'
import { ZERO_ADDRESS, FUNCTION_SIGNATURES } from '../../constants.js'
import { toTronHex } from '../../address.js'
import { encodeParams, hex, normalizeAddress } from '../../utils.js'
import { findUserLockedEvent } from '../helpers.js'

export async function getUserLockDetails(
    rpc: TronRpcClient,
    params: LockParams,
): Promise<UserLockDetails | null> {
    const { id, contractAddress, txId, decimals } = params

    const contractHex = toTronHex(contractAddress)
    // Use a dummy owner for read calls
    const dummyOwner = contractHex

    const calldata = AbiFunction.encodeData(htlcFunctions.getUserLock, [hex(id)])
    const parameter = encodeParams(calldata)
    const raw = await rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.getUserLock, parameter, dummyOwner)
    const result = AbiFunction.decodeResult(htlcFunctions.getUserLock, hex('0x' + raw)) as any

    const parsedResult = resolveUserLock(result, id, decimals)
    if (!parsedResult) return null

    let blockTimestamp: number | undefined
    let eventDerivedData = {} as Partial<EventDerivedData>

    if (txId) {
        try {
            const txInfo = await rpc.getTransactionInfoById(txId)
            if (txInfo?.log) {
                const lockEvent = findUserLockedEvent(txInfo.log, id)
                if (lockEvent) {
                    eventDerivedData = pickEventDerivedData(lockEvent)
                }

                if (txInfo.blockTimeStamp) {
                    blockTimestamp = txInfo.blockTimeStamp
                }
            }
        } catch (e) {
            console.error('Error fetching userData from tx info:', e)
        }
    }

    return { ...eventDerivedData, ...parsedResult, blockTimestamp }
}

export function resolveUserLock(result: any, id: string, decimals: number): BaseLockDetails | null {
    if (result.sender === ZERO_ADDRESS) return null
    if (!result.timelock) return null

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), decimals)),
        secret: BigInt(result.secret),
        sender: normalizeAddress(result.sender),
        recipient: normalizeAddress(result.recipient),
        token: normalizeAddress(result.token),
        timelock: Number(result.timelock),
        status: Number(result.status) as LockStatus,
    }
}

export const eventDerivedDataKeys: readonly (keyof EventDerivedData)[] = [
    'userData', 'solverData',
    'reward', 'rewardToken', 'rewardRecipient', 'rewardTimelock',
    'dstChain', 'dstAddress', 'dstAmount', 'dstToken',
] as const

export function pickEventDerivedData(event: Record<string, unknown>): Partial<EventDerivedData> {
    const data: Record<string, unknown> = {}
    for (const key of eventDerivedDataKeys) {
        if (key in event && event[key] != null) {
            data[key] = event[key]
        }
    }
    return data as Partial<EventDerivedData>
}
