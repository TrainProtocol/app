import { AztecAddress } from '@aztec/aztec.js/addresses'
import type { AztecNode } from '@aztec/aztec.js/node'
import { hexToBytes } from '@train-protocol/sdk'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import { TokenContract } from '../../artifacts/Token'
import type { AztecSigner, AztecTransactionRequest } from '../../types'
import { getContractInstance } from '../helpers'

export async function buildRedeemSolverTx(
    signer: AztecSigner,
    rpcUrl: string,
    params: RedeemSolverParams,
    node: AztecNode,
): Promise<AztecTransactionRequest> {
    const { contract, node: contractNode } = await getContractInstance(params.contractAddress, signer, node)

    if (params.destinationAsset?.contract) {
        const tokenAddress = AztecAddress.fromString(params.destinationAsset.contract)
        const tokenInstance = await contractNode.getContract(tokenAddress)
        if (!tokenInstance) {
            throw new Error(
                `Token contract not found at ${tokenAddress.toString()} on node ${rpcUrl}`,
            )
        }
        await signer.wallet.registerContract(tokenInstance, TokenContract.artifact)
        await signer.wallet.registerSender(AztecAddress.fromString(params.contractAddress))
    }

    const hashlockBytes = hexToBytes(params.id, 32)

    const secretHex = typeof params.secret === 'bigint'
        ? '0x' + params.secret.toString(16).padStart(64, '0')
        : String(params.secret)
    const secretBytes = hexToBytes(secretHex, 32)

    return contract.methods.redeem_solver(hashlockBytes, BigInt(params.index ?? 1), secretBytes)
}
