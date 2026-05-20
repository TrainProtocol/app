import { parseUnits } from '@train-protocol/sdk'
import type { UserLockParams, AtomicResult } from '@train-protocol/sdk'
import type { JsonRpcClient } from '../../rpc.js'
import type { EvmSigner, RpcTransactionReceipt } from '../../types.js'
import { ZERO_ADDRESS } from '../../constants.js'
import { decodeContractError } from '../../utils.js'
import { buildUserLockTx } from './buildUserLockTx.js'
import { buildApproveTx } from './buildApproveTx.js'
import { getErc20Allowance } from '../public/getErc20Allowance.js'

export async function userLock(
    rpc: JsonRpcClient,
    signer: EvmSigner,
    params: UserLockParams,
): Promise<AtomicResult> {
    const tokenAddress = params.sourceAsset.contract
    const isNativeToken = !tokenAddress || tokenAddress === ZERO_ADDRESS
    const parsedAmount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)

    if (!isNativeToken) {
        const allowance = await getErc20Allowance(
            rpc,
            tokenAddress!,
            params.sourceAddress,
            params.atomicContract,
        )
        if (allowance < parsedAmount) {
            const approveTx = buildApproveTx({
                token: tokenAddress!,
                spender: params.atomicContract,
                amount: parsedAmount,
            })
            const approveHash = await signer.sendTransaction(approveTx)
            await waitForReceipt(rpc, approveHash)
        }
    }

    const lockTx = buildUserLockTx(params)

    try {
        await rpc.ethCall(
            lockTx.to,
            lockTx.data,
            params.sourceAddress,
            lockTx.value,
        )

        const hash = await signer.sendTransaction(lockTx)

        return { hash, hashlock: params.hashlock, nonce: params.nonce }
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in userLock:', error)
        throw error
    }
}

export async function waitForReceipt(
    rpc: JsonRpcClient,
    txHash: string,
    options?: { timeout?: number; interval?: number }
): Promise<RpcTransactionReceipt> {
    const timeout = options?.timeout ?? 120_000
    const interval = options?.interval ?? 2_000
    const start = Date.now()

    while (Date.now() - start < timeout) {
        const receipt = await rpc.getTransactionReceipt(txHash)
        if (receipt) {
            if (receipt.status === '0x0') {
                throw new Error(`Transaction reverted: ${txHash}`)
            }
            return receipt
        }
        await new Promise(r => setTimeout(r, interval))
    }
    throw new Error(`Transaction receipt timeout after ${timeout}ms: ${txHash}`)
}
