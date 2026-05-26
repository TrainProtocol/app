import { cairo, CallData } from 'starknet'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import type { StarknetTransactionRequest } from '../../types.js'

export function buildRedeemSolverTx(params: RedeemSolverParams): StarknetTransactionRequest {
    return {
        contractAddress: params.contractAddress,
        entrypoint: 'redeem_solver',
        calldata: CallData.compile([
            cairo.uint256(BigInt(params.id)),
            cairo.uint256(BigInt(params.index ?? 1)),
            cairo.uint256(BigInt(params.secret)),
        ]),
    }
}
