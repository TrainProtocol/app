import { AbiFunction } from 'ox'
import type { RefundParams } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { TronTransactionRequest } from '../../types.js'
import { DEFAULT_FEE_LIMIT, FUNCTION_SIGNATURES } from '../../constants.js'
import { toTronHex } from '../../address.js'
import { encodeParams, hex } from '../../utils.js'

export function buildRefundTx(params: RefundParams): TronTransactionRequest {
    const calldata = AbiFunction.encodeData(htlcFunctions.refundUser, [hex(params.id)])
    return {
        contractAddress: toTronHex(params.contractAddress),
        functionSelector: FUNCTION_SIGNATURES.refundUser,
        parameter: encodeParams(calldata),
        callValue: 0,
        feeLimit: DEFAULT_FEE_LIMIT,
    }
}
