import type { RpcProvider } from 'starknet'
import { TransactionStatus } from '@train-protocol/sdk'
import type { TransactionInfo } from '@train-protocol/sdk'

export async function getTransaction(
    provider: RpcProvider,
    txHash: string,
): Promise<TransactionInfo | null> {
    try {
        const receipt = await provider.getTransactionReceipt(txHash)
        if (!receipt) return null

        const executionStatus = 'execution_status' in receipt
            ? (receipt as any).execution_status as string
            : undefined

        return {
            hash: txHash,
            status: executionStatus === 'REVERTED'
                ? TransactionStatus.Failed
                : executionStatus === 'SUCCEEDED'
                    ? TransactionStatus.Confirmed
                    : TransactionStatus.Pending,
            blockNumber: 'block_number' in receipt
                ? String((receipt as any).block_number)
                : undefined,
        }
    } catch {
        return null
    }
}
