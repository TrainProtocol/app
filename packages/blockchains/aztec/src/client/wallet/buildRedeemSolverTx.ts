import { AztecAddress } from '@aztec/aztec.js/addresses'
import type { AztecNode } from '@aztec/aztec.js/node'
import { hexToBytes } from '@train-protocol/sdk'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import { TokenContract } from '../../artifacts/Token'
import type { AztecSigner, AztecTransactionRequest } from '../../types'
import { getContractInstance, registerContractCompat } from '../helpers'

export async function buildRedeemSolverTx(
    signer: AztecSigner,
    rpcUrl: string,
    params: RedeemSolverParams,
    node: AztecNode,
): Promise<AztecTransactionRequest> {
    const { contract, node: contractNode } = await getContractInstance(params.contractAddress, signer, node)

    if (params.destinationAsset?.contract) {
        // Best-effort: redeem_solver is a public function, so the wallet doesn't need
        // the token artifact to build or execute the redeem — registration only helps
        // the wallet recognize the incoming token. A bundled artifact that lags the
        // deployed token (class id mismatch) must not block the claim.
        try {
            const tokenAddress = AztecAddress.fromStringUnsafe(params.destinationAsset.contract)
            const tokenInstance = await contractNode.getContract(tokenAddress)
            if (!tokenInstance) {
                throw new Error(
                    `Token contract not found at ${tokenAddress.toString()} on node ${rpcUrl}`,
                )
            }
            await registerContractCompat(signer.wallet, tokenInstance, TokenContract.artifact)
            await signer.wallet.registerSender(AztecAddress.fromStringUnsafe(params.contractAddress))
        } catch (error) {
            console.warn('[Aztec redeemSolver] token registration skipped:', error)
        }
    }

    const hashlockBytes = hexToBytes(params.id, 32)

    const secretHex = typeof params.secret === 'bigint'
        ? '0x' + params.secret.toString(16).padStart(64, '0')
        : String(params.secret)
    const secretBytes = hexToBytes(secretHex, 32)

    return contract.methods.redeem_solver(hashlockBytes, BigInt(params.index ?? 1), secretBytes)
}
