import { addAddressPadding, num, type RpcProvider } from 'starknet'
import type { Network, UserLockDetails } from '@train-protocol/sdk'
import { findUserLockedEvent } from '../helpers.js'
import { getUserLockDetails } from './getUserLockDetails.js'

export async function recoverSwap(
    provider: RpcProvider,
    txHash: string,
    network: Network,
): Promise<UserLockDetails> {
    if (!/^0x[a-fA-F0-9]{1,64}$/.test(txHash))
        throw new Error('Invalid transaction hash format')

    const event = await findUserLockedEvent(provider, txHash)
    if (!event) throw new Error('This transaction does not contain a swap lock')

    const eventHashlock = addAddressPadding(num.toHex(event.hashlock))
    const eventToken = addAddressPadding(num.toHex(event.token))

    const token = network.tokens.find(t => t.contract?.toLowerCase() === eventToken.toLowerCase())
    if(!token) throw new Error('Token not found')
    const decimals = token?.decimals

    const result = await getUserLockDetails(provider, {
        id: eventHashlock,
        contractAddress: network.trainContract,
        decimals,
        txId: txHash,
        chainId: network.chainId,
    })

    if (!result) throw new Error('Lock not found for recovered hashlock')

    return result
}
