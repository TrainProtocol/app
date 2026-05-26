import { TransactionStatus } from '@train-protocol/sdk'
import type { TransactionInfo } from '@train-protocol/sdk'
import type { JsonRpcClient } from '../../rpc.js'

export async function getTransaction(
    rpc: JsonRpcClient,
    txHash: string,
): Promise<TransactionInfo | null> {
    try {
        const receipt = await rpc.getTransactionReceipt(txHash)

        if (!receipt) {
            const tx = await rpc.getTransaction(txHash)
            if (!tx) return null

            return {
                hash: txHash,
                status: TransactionStatus.Pending,
            }
        }

        return {
            hash: receipt.transactionHash,
            status: receipt.status === '0x1' ? TransactionStatus.Confirmed : TransactionStatus.Failed,
            blockNumber: receipt.blockNumber,
        }
    } catch {
        return null
    }
}
