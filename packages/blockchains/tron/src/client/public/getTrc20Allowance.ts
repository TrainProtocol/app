import { AbiFunction } from 'ox'
import { trc20Functions } from '../../abi.js'
import type { TronRpcClient } from '../../rpc.js'
import { FUNCTION_SIGNATURES } from '../../constants.js'
import { toEvmHex, toTronHex } from '../../address.js'
import { encodeParams, hex } from '../../utils.js'

export async function getTrc20Allowance(
    rpc: TronRpcClient,
    token: string,
    owner: string,
    spender: string,
): Promise<bigint> {
    const calldata = AbiFunction.encodeData(trc20Functions.allowance, [
        toEvmHex(owner),
        toEvmHex(spender),
    ])
    const raw = await rpc.triggerConstantContract(
        toTronHex(token),
        FUNCTION_SIGNATURES.allowance,
        encodeParams(calldata),
        toTronHex(owner),
    )
    return AbiFunction.decodeResult(trc20Functions.allowance, hex('0x' + raw))
}
