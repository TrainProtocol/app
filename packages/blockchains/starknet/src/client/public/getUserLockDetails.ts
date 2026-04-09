import { cairo, type RpcProvider } from 'starknet'
import { formatUnits } from '@train-protocol/sdk'
import type { LockParams, UserLockDetails, BaseLockDetails, EventDerivedData } from '@train-protocol/sdk'
import { ZERO_ADDRESS } from '../../constants.js'
import { formatStarknetAddress } from '../../utils.js'
import { createContract, mapLockStatus, findUserLockedEvent, pickStarknetEventData } from '../helpers.js'

export async function getUserLockDetails(
    provider: RpcProvider,
    params: LockParams,
): Promise<UserLockDetails | null> {
    const { id, contractAddress, txId } = params
    const contract = createContract(contractAddress, provider)

    try {
        const result = await contract.get_user_lock(cairo.uint256(BigInt(id)))

        const sender = '0x' + BigInt(result.sender).toString(16)
        if (sender === ZERO_ADDRESS || BigInt(result.sender) === 0n) {
            return null
        }

        const parsedResult: BaseLockDetails = {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
            secret: BigInt(result.secret),
            timelock: Number(result.timelock),
            status: mapLockStatus(result.status),
            sender,
            recipient: formatStarknetAddress(result.recipient).toString(),
            token: formatStarknetAddress(result.token).toString(),
        }

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
