import type { RedeemSolverParams } from '@train-protocol/sdk'
import type { JsonRpcClient } from '../../rpc.js'
import type { EvmSigner } from '../../types.js'
import { decodeContractError } from '../../utils.js'
import { buildRedeemSolverTx } from './buildRedeemSolverTx.js'

export async function redeemSolver(
    rpc: JsonRpcClient,
    signer: EvmSigner,
    params: RedeemSolverParams,
): Promise<string> {
    const caller = params.destinationAddress ?? signer.address
    const tx = buildRedeemSolverTx(params)

    try {
        await rpc.ethCall(tx.to, tx.data, caller)
        return signer.sendTransaction(tx)
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in redeemSolver:', error)
        throw error
    }
}
