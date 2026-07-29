import type { RefundParams } from '@train-protocol/sdk'
import type { FuelSigner } from '../../types.js'
import { buildRefundTx } from './buildRefundTx.js'

export async function refund(signer: FuelSigner, params: RefundParams): Promise<string> {
    try {
        const request = await buildRefundTx(signer, params)
        const response = await signer.account.sendTransaction(request, {
            estimateTxDependencies: false,
        })
        await response.waitForResult()
        return response.id
    } catch (error) {
        console.error('Error in Fuel refund:', error)
        throw error
    }
}
