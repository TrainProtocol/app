import { AbiFunction } from 'ox'
import type { RefundParams } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { JsonRpcClient } from '../../rpc.js'
import type { EvmSigner } from '../../types.js'
import { decodeContractError, hex } from '../../utils.js'

export async function refund(
    rpc: JsonRpcClient,
    signer: EvmSigner,
    params: RefundParams,
): Promise<string> {
    const { id, contractAddress } = params

    const calldata = AbiFunction.encodeData(htlcFunctions.refundUser, [hex(id)])

    try {
        await rpc.ethCall(contractAddress, calldata, signer.address)

        return signer.sendTransaction({ to: contractAddress, data: calldata })
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in refund:', error)
        throw error
    }
}
