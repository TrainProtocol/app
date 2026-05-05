import type { AztecNode } from '@aztec/aztec.js/node'
import { hexToBytes } from '@train-protocol/sdk'
import type { RefundParams } from '@train-protocol/sdk'
import type { AztecSigner } from '../../types'
import { getContractInstance } from '../helpers'

export async function refund(
    signer: AztecSigner,
    params: RefundParams,
    node: AztecNode,
): Promise<string> {
    try {
        const { contract } = await getContractInstance(params.contractAddress, signer, node)
        const accounts = await signer.wallet.getAccounts()
        const senderAddress = accounts[0].item

        const hashlockBytes = hexToBytes(params.id, 32)
        const txTimeout = 120000

        const tx = await contract.methods
            .refund_user(hashlockBytes)
            .send({
                from: senderAddress,
                wait: { timeout: txTimeout, dontThrowOnRevert: true },
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
