import { parseUnits } from '@train-protocol/sdk'
import type { UserLockParams, AtomicResult } from '@train-protocol/sdk'
import type { StarknetSigner } from '../../types.js'
import { buildUserLockTx } from './buildUserLockTx.js'
import { buildApproveTx } from './buildApproveTx.js'
import { ZERO_ADDRESS } from '../../constants.js'

export async function userLock(
    signer: StarknetSigner,
    params: UserLockParams,
): Promise<AtomicResult> {
    const parsedAmount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)
    const tokenAddress = params.sourceAsset.contract || ZERO_ADDRESS

    const approveCall = buildApproveTx({
        token: tokenAddress,
        spender: params.atomicContract,
        amount: parsedAmount,
    })
    const lockCall = buildUserLockTx(params)

    try {
        const { transaction_hash } = await signer.account.execute([approveCall, lockCall])
        await signer.account.waitForTransaction(transaction_hash)

        return { hash: transaction_hash, hashlock: params.hashlock, nonce: params.nonce }
    } catch (error) {
        console.error('Error in userLock:', error)
        throw error
    }
}
