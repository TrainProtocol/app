import { AbiFunction } from 'ox'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { EvmTransactionRequest } from '../../types.js'
import { hex } from '../../utils.js'

export function buildRedeemSolverTx(params: RedeemSolverParams): EvmTransactionRequest {
    const data = AbiFunction.encodeData(htlcFunctions.redeemSolver, [
        hex(params.id),
        1n,
        BigInt(params.secret),
    ])
    return { to: params.contractAddress, data }
}
