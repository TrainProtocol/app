import type { RefundParams } from '@train-protocol/sdk'
import type { FuelSigner, FuelTransactionRequest } from '../../types.js'
import { buildContract } from '../helpers.js'

export async function buildRefundTx(
    signer: FuelSigner,
    params: RefundParams,
): Promise<FuelTransactionRequest> {
    if (!params.contractAddress) throw new Error('No contract address')
    const contract = buildContract(params.contractAddress, signer.account)
    return contract.functions.refund_user(params.id).fundWithRequiredCoins()
}
