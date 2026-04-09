import { AbiFunction } from 'ox'
import { LockStatus, formatUnits } from '@train-protocol/sdk'
import type { LockParams, UserLockDetails, BaseLockDetails, EventDerivedData } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { TronRpcClient } from '../../rpc.js'
import { ZERO_ADDRESS, FUNCTION_SIGNATURES } from '../../constants.js'
import { pickEventDerivedData } from '../../helpers.js'
import { toTronHex } from '../../address.js'
import { encodeParams, hex, normalizeAddresses, normalizeAddress } from '../../utils.js'
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

    if (!result.timelock) return null

    const lockExists = result.sender !== ZERO_ADDRESS
    if (!lockExists) return null

    const parsedResult: BaseLockDetails = {
        ...normalizeAddresses(result),
        hashlock: id,
        token: normalizeAddress(result.token),
        amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
        secret: BigInt(result.secret),
        timelock: Number(result.timelock),
        status: Number(result.status) as LockStatus,
    }

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
