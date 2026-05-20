import { AbiFunction } from 'ox'
import { erc20Functions } from '../../abi.js'
import type { EvmTransactionRequest } from '../../types.js'
import { hex } from '../../utils.js'

export interface BuildApproveTxParams {
    token: string
    spender: string
    amount: bigint
}

export function buildApproveTx(params: BuildApproveTxParams): EvmTransactionRequest {
    const data = AbiFunction.encodeData(erc20Functions.approve, [
        hex(params.spender),
        params.amount,
    ])
    return { to: params.token, data }
}
