import { Connection } from '@solana/web3.js'
import { TransactionStatus } from '@train-protocol/sdk'
import type { TransactionInfo } from '@train-protocol/sdk'

export async function getTransaction(
    connection: Connection,
    txHash: string,
): Promise<TransactionInfo | null> {
    const tx = await connection.getTransaction(txHash, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
    })

    if (!tx) {
        const statuses = await connection.getSignatureStatuses([txHash])
        const status = statuses?.value?.[0]
        if (!status) return null

        if (status.err) {
            return {
                hash: txHash,
                status: TransactionStatus.Failed,
                blockNumber: status.slot?.toString(),
            }
        }

        return {
            hash: txHash,
            status: status.confirmationStatus === 'finalized' || status.confirmationStatus === 'confirmed'
                ? TransactionStatus.Confirmed
                : TransactionStatus.Pending,
            blockNumber: status.slot?.toString(),
        }
    }

    return {
        hash: txHash,
        status: tx.meta?.err ? TransactionStatus.Failed : TransactionStatus.Confirmed,
        blockNumber: tx.slot?.toString(),
        blockTimestamp: tx.blockTime ? tx.blockTime * 1000 : undefined,
    }
}
