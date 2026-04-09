import { AbiFunction } from 'ox'
import { LockStatus, formatUnits } from '@train-protocol/sdk'
import type { LockParams, UserLockDetails, BaseLockDetails, EventDerivedData } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { JsonRpcClient } from '../../rpc.js'
import { ZERO_ADDRESS } from '../../constants.js'
import { pickEventDerivedData } from '../../helpers.js'
import { hex } from '../../utils.js'
import { findUserLockedEvent } from '../helpers.js'

export async function getUserLockDetails(
    rpc: JsonRpcClient,
    params: LockParams,
): Promise<UserLockDetails | null> {
    const { id, contractAddress, txId } = params

    const calldata = AbiFunction.encodeData(htlcFunctions.getUserLock, [hex(id)])
    const raw = await rpc.ethCall(contractAddress, calldata)
    const result = AbiFunction.decodeResult(htlcFunctions.getUserLock, hex(raw)) as any

    const lockExists = result.sender !== ZERO_ADDRESS
    if (!lockExists) return null

    const parsedResult: BaseLockDetails = {
        ...result,
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
        secret: BigInt(result.secret),
        timelock: Number(result.timelock),
        status: Number(result.status) as LockStatus,
    }

    let blockTimestamp: number | undefined
    let eventDerivedData = {} as Partial<EventDerivedData>

    if (lockExists && txId) {
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
