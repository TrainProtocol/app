import type { RefundParams } from '@train-protocol/sdk'
import type { StarknetSigner } from '../../types.js'
import { buildRefundTx } from './buildRefundTx.js'

export async function refund(
    signer: StarknetSigner,
    params: RefundParams,
): Promise<string> {
    const call = buildRefundTx(params)

    try {
        const { transaction_hash } = await signer.account.execute([call])
        await signer.account.waitForTransaction(transaction_hash)
        return transaction_hash
    } catch (error) {
        console.error('Error in refund:', error)
        throw error
    }
}
