import { AbiFunction } from 'ox'
import type { LockParams, UserLockDetails, EventDerivedData, BaseLockDetails } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { JsonRpcClient } from '../../rpc.js'
import { hex } from '../../utils.js'
import { findUserLockedEvent } from '../helpers.js'
import { LockStatus, formatUnits } from '@train-protocol/sdk'
import { ZERO_ADDRESS } from '../../constants.js'

export async function getUserLockDetails(
    rpc: JsonRpcClient,
    params: LockParams,
): Promise<UserLockDetails | null> {
    const { id, contractAddress, txId } = params

    const calldata = AbiFunction.encodeData(htlcFunctions.getUserLock, [hex(id)])
    const raw = await rpc.ethCall(contractAddress, calldata)
    const result = AbiFunction.decodeResult(htlcFunctions.getUserLock, hex(raw)) as any

    const parsedResult = resolveUserLock(result, id, params.decimals)
    if (!parsedResult) return null

    let blockTimestamp: number | undefined
    let eventDerivedData = {} as Partial<EventDerivedData>

    if (txId) {
        try {
            const receipt = await rpc.getTransactionReceipt(txId)
            if (receipt) {
                const lockEvent = findUserLockedEvent(receipt.logs, id)
                if (lockEvent) {
                    eventDerivedData = pickEventDerivedData(lockEvent)
                }

                const block = await rpc.getBlockByNumber(receipt.blockNumber)
                if (block) {
                    blockTimestamp = Number(BigInt(block.timestamp)) * 1000
                }
            }
        } catch (e) {
            console.error('Error fetching userData from tx receipt:', e)
        }
    }

    return { ...parsedResult, ...eventDerivedData, blockTimestamp }
}

export function resolveUserLock(result: any, id: string, decimals: number): BaseLockDetails | null {
    if (result.sender === ZERO_ADDRESS) return null

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), decimals)),
        secret: BigInt(result.secret),
        sender: result.sender,
        recipient: result.recipient,
        token: result.token,
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
