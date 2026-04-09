import { cairo } from 'starknet'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import type { StarknetSigner } from '../../types.js'
import { createContract } from '../helpers.js'

export async function redeemSolver(
    signer: StarknetSigner,
    params: RedeemSolverParams,
): Promise<string> {
    const { id, contractAddress, secret, index } = params

    const contract = createContract(contractAddress, signer.account)

    try {
        const resp = await contract.invoke('redeem_solver', [
            cairo.uint256(BigInt(id)),
            cairo.uint256(BigInt(index ?? 1)),
            cairo.uint256(BigInt(secret)),
        ])
        await signer.account.waitForTransaction(resp.transaction_hash)
        return resp.transaction_hash
    } catch (error) {
        console.error('Error in redeemSolver:', error)
        throw error
    }
}
