import { cairo, type RpcProvider } from 'starknet'
import { formatUnits } from '@train-protocol/sdk'
import type { LockParams, UserLockDetails, EventDerivedData, BaseLockDetails } from '@train-protocol/sdk'
import { createContract, findUserLockedEvent, pickStarknetEventData, mapLockStatus } from '../helpers.js'
import { formatStarknetAddress } from '../../utils.js'

export async function getUserLockDetails(
    provider: RpcProvider,
    params: LockParams,
): Promise<UserLockDetails | null> {
    const { id, contractAddress, txId } = params
    const contract = createContract(contractAddress, provider)

    try {
        const result = await contract.get_user_lock(cairo.uint256(BigInt(id)))

        const parsedResult = resolveUserLock(result, id, params.decimals)
        if (!parsedResult) return null

        let eventDerivedData = {} as Partial<EventDerivedData>

        if (txId) {
            try {
                const event = await findUserLockedEvent(provider, txId, id)
                if (event) {
                    eventDerivedData = pickStarknetEventData(event)
                }
            } catch (e) {
                console.error('Error fetching event data from tx receipt:', e)
            }
        }

        return { ...parsedResult, ...eventDerivedData }
    } catch (error) {
        console.error('Error in getUserLockDetails:', error)
        return null
    }
}

export function resolveUserLock(result: any, id: string, decimals: number): BaseLockDetails | null {
    if (BigInt(result.sender) === 0n) return null

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), decimals)),
        secret: BigInt(result.secret),
        sender: formatStarknetAddress(result.sender).toString(),
        recipient: formatStarknetAddress(result.recipient).toString(),
        token: formatStarknetAddress(result.token).toString(),
        timelock: Number(result.timelock),
        status: mapLockStatus(result.status),
    }
}
