import { AbiFunction } from 'ox'
import { trc20Functions } from '../../abi.js'
import type { TronTransactionRequest } from '../../types.js'
import { DEFAULT_FEE_LIMIT, FUNCTION_SIGNATURES } from '../../constants.js'
import { toEvmHex, toTronHex } from '../../address.js'
import { encodeParams } from '../../utils.js'

export interface BuildApproveTxParams {
    token: string
    spender: string
    amount: bigint
}

export function buildApproveTx(params: BuildApproveTxParams): TronTransactionRequest {
    const calldata = AbiFunction.encodeData(trc20Functions.approve, [
        toEvmHex(params.spender),
        params.amount,
    ])
    return {
        contractAddress: toTronHex(params.token),
        functionSelector: FUNCTION_SIGNATURES.approve,
        parameter: encodeParams(calldata),
        callValue: 0,
        feeLimit: DEFAULT_FEE_LIMIT,
    }
}
