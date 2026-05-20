import type { AztecNode } from '@aztec/aztec.js/node'
import { hexToBytes } from '@train-protocol/sdk'
import type { RefundParams } from '@train-protocol/sdk'
import type { AztecSigner, AztecTransactionRequest } from '../../types'
import { getContractInstance } from '../helpers'

export async function buildRefundTx(
    signer: AztecSigner,
    params: RefundParams,
    node: AztecNode,
): Promise<AztecTransactionRequest> {
    const { contract } = await getContractInstance(params.contractAddress, signer, node)
    const hashlockBytes = hexToBytes(params.id, 32)
    return contract.methods.refund_user(hashlockBytes)
}
