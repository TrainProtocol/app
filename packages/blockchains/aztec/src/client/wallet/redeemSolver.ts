import type { AztecNode } from '@aztec/aztec.js/node'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import type { AztecSigner } from '../../types'
import { buildRedeemSolverTx } from './buildRedeemSolverTx'

export async function redeemSolver(
    signer: AztecSigner,
    rpcUrl: string,
    params: RedeemSolverParams,
    node: AztecNode,
): Promise<string> {
    try {
        const interaction = await buildRedeemSolverTx(signer, rpcUrl, params, node)
        const accounts = await signer.wallet.getAccounts()
        const senderAddress = accounts[0].item

        const tx = await interaction.send({
            from: senderAddress,
            wait: { timeout: 120000, dontThrowOnRevert: true },
        })

        if (tx.receipt.hasExecutionReverted()) {
            throw new Error(`redeem_solver reverted: ${tx.receipt.error ?? 'unknown error'}`)
        }

        return tx.receipt.txHash?.toString() ?? String(tx)
    } catch (error) {
        console.error('Error in redeemSolver:', error)
        throw error
    }
}
