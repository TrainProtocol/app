import { AbiFunction } from 'ox'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { JsonRpcClient } from '../../rpc.js'
import type { EvmSigner } from '../../types.js'
import { decodeContractError, hex } from '../../utils.js'

export async function redeemSolver(
    rpc: JsonRpcClient,
    signer: EvmSigner,
    params: RedeemSolverParams,
): Promise<string> {
    const { id, contractAddress, secret, destinationAddress } = params

    const caller = destinationAddress ?? signer.address
    const calldata = AbiFunction.encodeData(htlcFunctions.redeemSolver, [
        hex(id),
        1n,
        BigInt(secret),
    ])

    try {
        await rpc.ethCall(contractAddress, calldata, caller)

        return signer.sendTransaction({ to: contractAddress, data: calldata })
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in redeemSolver:', error)
        throw error
    }
}
