import { cairo, CallData } from 'starknet'
import type { RefundParams } from '@train-protocol/sdk'
import type { StarknetTransactionRequest } from '../../types.js'

export function buildRefundTx(params: RefundParams): StarknetTransactionRequest {
    return {
        contractAddress: params.contractAddress,
        entrypoint: 'refund_user',
        calldata: CallData.compile([cairo.uint256(BigInt(params.id))]),
    }
}
