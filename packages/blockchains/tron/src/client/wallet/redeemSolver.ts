import { AbiFunction } from 'ox'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { TronRpcClient } from '../../rpc.js'
import type { TronSigner } from '../../types.js'
import { DEFAULT_FEE_LIMIT, FUNCTION_SIGNATURES } from '../../constants.js'
import { toTronHex } from '../../address.js'
import { decodeContractError, encodeParams, hex } from '../../utils.js'

export async function redeemSolver(
    rpc: TronRpcClient,
    signer: TronSigner,
    params: RedeemSolverParams,
): Promise<string> {
    const { id, contractAddress, secret, destinationAddress } = params

    const caller = destinationAddress ?? signer.address
    const ownerHex = toTronHex(caller)
    const contractHex = toTronHex(contractAddress)

    const calldata = AbiFunction.encodeData(htlcFunctions.redeemSolver, [
        hex(id),
        1n,
        BigInt(secret),
    ])
    const parameter = encodeParams(calldata)

    try {
        await rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.redeemSolver, parameter, ownerHex)

        const unsignedTx = await rpc.triggerSmartContract(
            contractHex, FUNCTION_SIGNATURES.redeemSolver, parameter, ownerHex, 0, DEFAULT_FEE_LIMIT,
        )

        return signer.signAndBroadcast(unsignedTx)
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in redeemSolver:', error)
        throw error
    }
}
