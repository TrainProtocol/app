import type { RefundParams } from '@train-protocol/sdk'
import type { TronRpcClient } from '../../rpc.js'
import type { TronSigner } from '../../types.js'
import { toTronHex } from '../../address.js'
import { decodeContractError } from '../../utils.js'
import { buildRefundTx } from './buildRefundTx.js'

export async function refund(
    rpc: TronRpcClient,
    signer: TronSigner,
    params: RefundParams,
): Promise<string> {
    const req = buildRefundTx(params)
    const ownerHex = toTronHex(signer.address)

    try {
        await rpc.triggerConstantContract(req.contractAddress, req.functionSelector, req.parameter, ownerHex)
        const unsignedTx = await rpc.triggerSmartContract(
            req.contractAddress,
            req.functionSelector,
            req.parameter,
            ownerHex,
            req.callValue ?? 0,
            req.feeLimit ?? 0,
        )
        return signer.signAndBroadcast(unsignedTx)
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in refund:', error)
        throw error
    }
}
