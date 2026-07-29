import type { Provider } from 'fuels'
import {
    formatUnits,
    LockStatus,
} from '@train-protocol/sdk'
import type {
    BaseLockDetails,
    EventDerivedData,
    LockParams,
    UserLockDetails,
} from '@train-protocol/sdk'
import type { FuelUserLock } from '../../types.js'
import {
    decodeBytes,
    identityToAddress,
    mapFuelLockStatus,
    optionalContractIdToString,
    tai64ToUnixSeconds,
} from '../../utils.js'
import { buildContract, decodeTrainLogs, findUserLockedEvent } from '../helpers.js'

export async function getUserLockDetails(
    provider: Provider,
    params: LockParams,
): Promise<UserLockDetails | null> {
    if (!params.contractAddress) throw new Error('No contract address')

    try {
        const contract = buildContract(params.contractAddress, provider)
        const { value } = await contract.functions.get_user_lock(params.id).get()
        if (!value) return null

        const resolved = resolveUserLock(value as FuelUserLock, params.id, params.decimals)
        if (!resolved) return null

        if (!params.txId) return resolved

        const response = await provider.getTransactionResponse(params.txId)
        const result = await response.waitForResult()
        const event = findUserLockedEvent(decodeTrainLogs(result.receipts), params.id)
        const eventData: Partial<EventDerivedData> = event ? {
            dstChain: event.dst_chain,
            dstAddress: event.dst_address,
            dstAmount: BigInt(event.dst_amount.toString()),
            dstToken: event.dst_token,
            reward: Number(formatUnits(BigInt(event.reward_amount.toString()), params.decimals)),
            rewardToken: event.reward_token,
            rewardRecipient: event.reward_recipient,
            userData: decodeBytes(event.user_data),
            solverData: decodeBytes(event.solver_data),
        } : {}

        const time = response.gqlTransaction?.status && 'time' in response.gqlTransaction.status
            ? Date.parse(response.gqlTransaction.status.time)
            : undefined

        return {
            ...resolved,
            ...eventData,
            blockTimestamp: time !== undefined && Number.isFinite(time) ? time : undefined,
        }
    } catch (error) {
        console.error('[FuelHTLC][getUserLockDetails] fetch failed', error)
        return null
    }
}

export function resolveUserLock(
    result: FuelUserLock,
    id: string,
    decimals: number,
): BaseLockDetails | null {
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
    }
}
