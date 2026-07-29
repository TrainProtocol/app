import type { Provider } from 'fuels'
import {
    TransactionStatus,
} from '@train-protocol/sdk'
import type { TransactionInfo } from '@train-protocol/sdk'

export async function getTransaction(
    provider: Provider,
    txHash: string,
): Promise<TransactionInfo | null> {
    try {
        const { transaction } = await provider.operations.getTransactionWithReceipts({
            transactionId: txHash,
        })
        const status = transaction?.status
        if (!status) return null

        let mappedStatus: TransactionStatus
        switch (status.type) {
            case 'SuccessStatus':
                mappedStatus = TransactionStatus.Confirmed
                break
            case 'FailureStatus':
            case 'SqueezedOutStatus':
            case 'PreconfirmationFailureStatus':
                mappedStatus = TransactionStatus.Failed
                break
            default:
                mappedStatus = TransactionStatus.Pending
        }

        return {
            hash: txHash,
            status: mappedStatus,
        }
    } catch {
        return null
    }
}
