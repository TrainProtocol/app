import type { AtomicResult, UserLockParams } from '@train-protocol/sdk'
import type { FuelSigner } from '../../types.js'
import { buildUserLockTx } from './buildUserLockTx.js'

export async function userLock(
    signer: FuelSigner,
    params: UserLockParams,
): Promise<AtomicResult> {
    try {
        const request = await buildUserLockTx(signer, params)
        const response = await signer.account.sendTransaction(request, {
            estimateTxDependencies: false,
        })
        await response.waitForResult()
        return { hash: response.id, hashlock: params.hashlock, nonce: params.nonce }
    } catch (error) {
        console.error('Error in Fuel userLock:', error)
        throw error
    }
}
