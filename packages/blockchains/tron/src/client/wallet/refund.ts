import { AbiFunction } from 'ox'
import type { RefundParams } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { TronRpcClient } from '../../rpc.js'
import type { TronSigner } from '../../types.js'
import { DEFAULT_FEE_LIMIT, FUNCTION_SIGNATURES } from '../../constants.js'
import { toTronHex } from '../../address.js'
import { decodeContractError, encodeParams, hex } from '../../utils.js'

export async function refund(
    rpc: TronRpcClient,
    signer: TronSigner,
    params: RefundParams,
): Promise<string> {
    const { id, contractAddress } = params

    const ownerHex = toTronHex(signer.address)
    const contractHex = toTronHex(contractAddress)

    const calldata = AbiFunction.encodeData(htlcFunctions.refundUser, [hex(id)])
    const parameter = encodeParams(calldata)

    try {
        await rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.refundUser, parameter, ownerHex)

        const unsignedTx = await rpc.triggerSmartContract(
            contractHex, FUNCTION_SIGNATURES.refundUser, parameter, ownerHex, 0, DEFAULT_FEE_LIMIT,
        )

        return signer.signAndBroadcast(unsignedTx)
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in refund:', error)
        throw error
    }
}
