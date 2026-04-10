import type { AztecNode } from '@aztec/aztec.js/node'
import { TxHash } from '@aztec/aztec.js/tx'
import { TransactionStatus } from '@train-protocol/sdk'
import type { TransactionInfo } from '@train-protocol/sdk'

export async function getTransaction(
    node: AztecNode,
    txHash: string,
): Promise<TransactionInfo | null> {
    try {
        const receipt = await node.getTxReceipt(TxHash.fromString(txHash))

        if (!receipt) return null

        let status: TransactionStatus
        if (receipt.isDropped() || receipt.hasExecutionReverted()) {
            status = TransactionStatus.Failed
        } else if (receipt.isMined()) {
            status = TransactionStatus.Confirmed
        } else {
            status = TransactionStatus.Pending
        }

        return {
            hash: txHash,
            status,
            blockNumber: receipt.blockNumber != null
                ? String(receipt.blockNumber)
                : undefined,
        }
    } catch {
        return null
    }
}
