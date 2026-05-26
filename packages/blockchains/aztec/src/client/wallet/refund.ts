import type { AztecNode } from '@aztec/aztec.js/node'
import type { RefundParams } from '@train-protocol/sdk'
import type { AztecSigner } from '../../types'
import { buildRefundTx } from './buildRefundTx'

export async function refund(
    signer: AztecSigner,
    params: RefundParams,
    node: AztecNode,
): Promise<string> {
    try {
        const interaction = await buildRefundTx(signer, params, node)
        const accounts = await signer.wallet.getAccounts()
        const senderAddress = accounts[0].item

        const tx = await interaction.send({
            from: senderAddress,
            wait: { timeout: 120000, dontThrowOnRevert: true },
        })

        if (tx.receipt.hasExecutionReverted()) {
            throw new Error(`refund_user reverted: ${tx.receipt.error ?? 'unknown error'}`)
        }

        return tx.receipt.txHash?.toString() ?? String(tx)
    } catch (error) {
        console.error('Error in refund:', error)
        throw error
    }
}
