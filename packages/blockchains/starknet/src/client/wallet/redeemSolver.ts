import type { RedeemSolverParams } from '@train-protocol/sdk'
import type { StarknetSigner } from '../../types.js'
import { buildRedeemSolverTx } from './buildRedeemSolverTx.js'

export async function redeemSolver(
    signer: StarknetSigner,
    params: RedeemSolverParams,
): Promise<string> {
    const call = buildRedeemSolverTx(params)

    try {
        const { transaction_hash } = await signer.account.execute([call])
        await signer.account.waitForTransaction(transaction_hash)
        return transaction_hash
    } catch (error) {
        console.error('Error in redeemSolver:', error)
        throw error
    }
}
