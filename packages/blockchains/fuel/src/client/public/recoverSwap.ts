import type { Provider } from 'fuels'
import { InvalidTxHashError } from '@train-protocol/sdk'
import type {
    LockParams,
    Network,
    UserLockDetails,
} from '@train-protocol/sdk'
import { isFuelTxHash } from '../../utils.js'
import { decodeTrainLogs, findUserLockedEvent } from '../helpers.js'

export async function recoverSwap(
    provider: Provider,
    txHash: string,
    network: Network,
    getUserLockDetailsFn?: (params: LockParams) => Promise<UserLockDetails | null>,
): Promise<UserLockDetails> {
    if (!isFuelTxHash(txHash)) throw new InvalidTxHashError()

    const response = await provider.getTransactionResponse(txHash)
    const result = await response.waitForResult()
    const event = findUserLockedEvent(decodeTrainLogs(result.receipts))
    if (!event) throw new Error('This transaction does not contain a swap lock')

    const tokenAddress = event.asset_id.bits
    const token = network.tokens.find(candidate =>
        candidate.contract?.toLowerCase() === tokenAddress.toLowerCase()
    )
    if (!token) throw new Error(`Fuel asset not found in network settings: ${tokenAddress}`)

    const resolve = getUserLockDetailsFn ?? (async params => {
        const { getUserLockDetails } = await import('./getUserLockDetails.js')
        return getUserLockDetails(provider, params)
    })

    const lock = await resolve({
        id: event.hashlock,
        contractAddress: network.trainContract,
        decimals: token.decimals,
        txId: txHash,
        chainId: network.chainId,
    })
    if (!lock) throw new Error('Lock not found for recovered hashlock')
    return lock
}
