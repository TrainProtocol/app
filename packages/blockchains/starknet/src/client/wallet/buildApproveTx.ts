import { cairo, CallData } from 'starknet'
import type { StarknetTransactionRequest } from '../../types.js'

export interface BuildApproveTxParams {
    token: string
    spender: string
    amount: bigint
}

export function buildApproveTx(params: BuildApproveTxParams): StarknetTransactionRequest {
    return {
        contractAddress: params.token,
        entrypoint: 'approve',
        calldata: CallData.compile([params.spender, cairo.uint256(params.amount)]),
    }
}
