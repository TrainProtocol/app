import { AbiFunction } from 'ox'
import type { RefundParams } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { EvmTransactionRequest } from '../../types.js'
import { hex } from '../../utils.js'

export function buildRefundTx(params: RefundParams): EvmTransactionRequest {
    const data = AbiFunction.encodeData(htlcFunctions.refundUser, [hex(params.id)])
    return { to: params.contractAddress, data }
}
