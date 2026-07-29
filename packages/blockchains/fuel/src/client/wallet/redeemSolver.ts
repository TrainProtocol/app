import type { RedeemSolverParams } from '@train-protocol/sdk'
import type { FuelSigner } from '../../types.js'
import { buildRedeemSolverTx } from './buildRedeemSolverTx.js'

export async function redeemSolver(
    signer: FuelSigner,
    params: RedeemSolverParams,
): Promise<string> {
    try {
        const request = await buildRedeemSolverTx(signer, params)
        const response = await signer.account.sendTransaction(request, {
            estimateTxDependencies: false,
        })
        await response.waitForResult()
        return response.id
    } catch (error) {
        console.error('Error in Fuel redeemSolver:', error)
        throw error
    }
}
