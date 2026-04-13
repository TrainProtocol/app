import { InvalidTxHashError } from '@train-protocol/sdk'
import type { LockParams, Network, UserLockDetails } from '@train-protocol/sdk'
import type { JsonRpcClient } from '../../rpc.js'
import { findUserLockedEvent } from '../helpers.js'
import { getUserLockDetails } from './getUserLockDetails.js'

export async function recoverSwap(
    rpc: JsonRpcClient,
    txHash: string,
    network: Network,
): Promise<UserLockDetails> {
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash))
        throw new InvalidTxHashError()

    const receipt = await rpc.getTransactionReceipt(txHash)
    if (!receipt) throw new Error('Transaction not found')

    const lockEvent = findUserLockedEvent(receipt.logs)
    if (!lockEvent) throw new Error('This transaction does not contain a swap lock')

    const token = network.tokens.find(t => t.contract?.toLowerCase() === (lockEvent.token as string).toLowerCase())
    if (!token) throw new Error('Token not found')

    const result = await getUserLockDetails(rpc, {
        id: lockEvent.hashlock as string,
        contractAddress: network.trainContract,
        decimals: token?.decimals,
        txId: txHash,
        chainId: network.chainId,
    })

    if (!result) throw new Error('Lock not found for recovered hashlock')

    return result
}
