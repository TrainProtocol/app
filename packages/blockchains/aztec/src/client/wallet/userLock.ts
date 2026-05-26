import { BatchCall } from '@aztec/aztec.js/contracts'
import type { AztecNode } from '@aztec/aztec.js/node'
import type { UserLockParams, AtomicResult } from '@train-protocol/sdk'
import type { AztecSigner } from '../../types'
import { buildUserLockTx } from './buildUserLockTx'

export async function userLock(
    signer: AztecSigner,
    rpcUrl: string,
    params: UserLockParams,
    node: AztecNode,
): Promise<AtomicResult> {
    try {
        const interactions = await buildUserLockTx(signer, rpcUrl, params, node)
        const accounts = await signer.wallet.getAccounts()
        const senderAddress = accounts[0].item

        const batch = new BatchCall(signer.wallet, interactions)
        const txTimeout = 120000
        const tx = await batch.send({
            from: senderAddress,
            wait: { timeout: txTimeout, dontThrowOnRevert: true },
        })

        if (tx.receipt.hasExecutionReverted()) {
            throw new Error(`user_lock reverted: ${tx.receipt.error ?? 'unknown error'}`)
        }

        return {
            hash: tx.receipt.txHash?.toString() ?? String(tx),
            hashlock: params.hashlock,
            nonce: params.nonce,
        }
    } catch (error) {
        console.error('Error in userLock:', error)
        throw error
    }
}
