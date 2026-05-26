import type { RedeemSolverParams } from '@train-protocol/sdk'
import type { TronRpcClient } from '../../rpc.js'
import type { TronSigner } from '../../types.js'
import { toTronHex } from '../../address.js'
import { decodeContractError } from '../../utils.js'
import { buildRedeemSolverTx } from './buildRedeemSolverTx.js'

export async function redeemSolver(
    rpc: TronRpcClient,
    signer: TronSigner,
    params: RedeemSolverParams,
): Promise<string> {
    const req = buildRedeemSolverTx(params)
    const caller = params.destinationAddress ?? signer.address
    const ownerHex = toTronHex(caller)

    try {
        await rpc.triggerConstantContract(req.contractAddress, req.functionSelector, req.parameter, ownerHex)
        const unsignedTx = await rpc.triggerSmartContract(
            req.contractAddress,
            req.functionSelector,
            req.parameter,
            ownerHex,
            req.callValue ?? 0,
            req.feeLimit ?? 0,
        )
        return signer.signAndBroadcast(unsignedTx)
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in redeemSolver:', error)
        throw error
    }
}
