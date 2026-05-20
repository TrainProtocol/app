import { AbiFunction } from 'ox'
import { erc20Functions } from '../../abi.js'
import type { JsonRpcClient } from '../../rpc.js'
import { hex } from '../../utils.js'

export async function getErc20Allowance(
    rpc: JsonRpcClient,
    token: string,
    owner: string,
    spender: string,
): Promise<bigint> {
    const data = AbiFunction.encodeData(erc20Functions.allowance, [hex(owner), hex(spender)])
    const raw = await rpc.ethCall(token, data)
    return AbiFunction.decodeResult(erc20Functions.allowance, hex(raw))
}
