import type { RefundParams } from '@train-protocol/sdk'
import type { JsonRpcClient } from '../../rpc.js'
import type { EvmSigner } from '../../types.js'
import { decodeContractError } from '../../utils.js'
import { buildRefundTx } from './buildRefundTx.js'

export async function refund(
    rpc: JsonRpcClient,
    signer: EvmSigner,
    params: RefundParams,
): Promise<string> {
    const tx = buildRefundTx(params)

    try {
        await rpc.ethCall(tx.to, tx.data, signer.address)
        return signer.sendTransaction(tx)
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in refund:', error)
        throw error
    }
}
