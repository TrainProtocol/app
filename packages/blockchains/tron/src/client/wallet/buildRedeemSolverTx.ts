import { AbiFunction } from 'ox'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { TronTransactionRequest } from '../../types.js'
import { DEFAULT_FEE_LIMIT, FUNCTION_SIGNATURES } from '../../constants.js'
import { toTronHex } from '../../address.js'
import { encodeParams, hex } from '../../utils.js'

export function buildRedeemSolverTx(params: RedeemSolverParams): TronTransactionRequest {
    const calldata = AbiFunction.encodeData(htlcFunctions.redeemSolver, [
        hex(params.id),
        1n,
        BigInt(params.secret),
    ])
    return {
        contractAddress: toTronHex(params.contractAddress),
        functionSelector: FUNCTION_SIGNATURES.redeemSolver,
        parameter: encodeParams(calldata),
        callValue: 0,
        feeLimit: DEFAULT_FEE_LIMIT,
    }
}
