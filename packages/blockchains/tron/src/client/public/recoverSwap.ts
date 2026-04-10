import { InvalidTxHashError } from '@train-protocol/sdk'
import type { Network, UserLockDetails } from '@train-protocol/sdk'
import type { TronRpcClient } from '../../rpc.js'
import { normalizeResultAddress } from '../../utils.js'
import { findUserLockedEvent } from '../helpers.js'
import { getUserLockDetails } from './getUserLockDetails.js'

export async function recoverSwap(
    rpc: TronRpcClient,
    txHash: string,
    network: Network,
): Promise<UserLockDetails> {
    // Tron txIDs are 64-char hex without 0x prefix
    if (!/^[a-fA-F0-9]{64}$/.test(txHash))
        throw new InvalidTxHashError()

    const txInfo = await rpc.getTransactionInfoById(txHash)
    if (!txInfo) throw new Error('Transaction not found')
    if (!txInfo.log) throw new Error('This transaction does not contain a swap lock')

    const lockEvent = findUserLockedEvent(txInfo.log)
    if (!lockEvent) throw new Error('This transaction does not contain a swap lock')

    const eventHashlock = lockEvent.hashlock as string
    const eventToken = normalizeResultAddress(lockEvent.token as string)

    const token = network.tokens.find(t => normalizeResultAddress(t.contract)?.toLowerCase() === (eventToken).toLowerCase())
    if (!token) throw new Error("Token not found")
    const decimals = token?.decimals

    const result = await getUserLockDetails(rpc, {
        id: eventHashlock,
        contractAddress: network.trainContract,
        decimals,
        txId: txHash,
        chainId: network.chainId,
    })

    if (!result) throw new Error('Lock not found for recovered hashlock')

    return result
}
