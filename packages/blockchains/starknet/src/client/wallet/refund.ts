import { cairo } from 'starknet'
import type { RefundParams } from '@train-protocol/sdk'
import type { StarknetSigner } from '../../types.js'
import { createContract } from '../helpers.js'

export async function refund(
    signer: StarknetSigner,
    params: RefundParams,
): Promise<string> {
    const { id, contractAddress } = params

    const contract = createContract(contractAddress, signer.account)

    try {
        const resp = await contract.invoke('refund_user', [cairo.uint256(BigInt(id))])
        await signer.account.waitForTransaction(resp.transaction_hash)
        return resp.transaction_hash
    } catch (error) {
        console.error('Error in refund:', error)
        throw error
    }
}
