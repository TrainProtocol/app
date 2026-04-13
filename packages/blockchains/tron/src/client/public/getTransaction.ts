import { TransactionStatus } from '@train-protocol/sdk'
import type { TransactionInfo } from '@train-protocol/sdk'
import type { TronRpcClient } from '../../rpc.js'

export async function getTransaction(
    rpc: TronRpcClient,
    txHash: string,
): Promise<TransactionInfo | null> {
    try {
        const txInfo = await rpc.getTransactionInfoById(txHash)

        if (!txInfo) {
            const tx = await rpc.getTransactionById(txHash)
            if (!tx) return null

            return {
                hash: txHash,
                status: TransactionStatus.Pending,
            }
        }

        const isFailed = txInfo.result === 'FAILED' || txInfo.receipt?.result === 'REVERT'
        return {
            hash: txHash,
            status: isFailed ? TransactionStatus.Failed : TransactionStatus.Confirmed,
            blockNumber: txInfo.blockNumber?.toString(),
            blockTimestamp: txInfo.blockTimeStamp,
        }
    } catch {
        return null
    }
}
