import type { RedeemSolverParams } from '@train-protocol/sdk'
import type { FuelSigner, FuelTransactionRequest } from '../../types.js'
import { identityFromAddress } from '../../utils.js'
import { buildContract } from '../helpers.js'

export async function buildRedeemSolverTx(
    signer: FuelSigner,
    params: RedeemSolverParams,
): Promise<FuelTransactionRequest> {
    if (!params.contractAddress) throw new Error('No contract address')
    const contract = buildContract(params.contractAddress, signer.account)
    return contract.functions
        .redeem_solver(params.id, identityFromAddress(params.solverAddress), BigInt(params.secret))
        .fundWithRequiredCoins()
}
