import { parseUnits } from '@train-protocol/sdk'
import type { UserLockParams, AtomicResult } from '@train-protocol/sdk'
import type { TronRpcClient } from '../../rpc.js'
import type { TronSigner, TronTransactionRequest } from '../../types.js'
import { ZERO_ADDRESS } from '../../constants.js'
import { toTronHex } from '../../address.js'
import { decodeContractError } from '../../utils.js'
import { buildUserLockTx } from './buildUserLockTx.js'
import { buildApproveTx } from './buildApproveTx.js'
import { getTrc20Allowance } from '../public/getTrc20Allowance.js'

export async function userLock(
    rpc: TronRpcClient,
    signer: TronSigner,
    params: UserLockParams,
): Promise<AtomicResult> {
    const tokenAddress = params.sourceAsset.contract
    const isNativeToken = !tokenAddress || tokenAddress === ZERO_ADDRESS
    const parsedAmount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)

    if (!isNativeToken) {
        const allowance = await getTrc20Allowance(
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
            const approveTxId = await sendRequest(rpc, signer, approveTx, params.sourceAddress)
            await waitForConfirmation(rpc, approveTxId)
        }
    }

    const lockTx = buildUserLockTx(params)

    try {
        const hash = await sendRequest(rpc, signer, lockTx, params.sourceAddress)
        return { hash, hashlock: params.hashlock, nonce: params.nonce }
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in userLock:', error)
        throw error
    }
}

async function sendRequest(
    rpc: TronRpcClient,
    signer: TronSigner,
    req: TronTransactionRequest,
    owner: string,
): Promise<string> {
    const ownerHex = toTronHex(owner)
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
}

async function waitForConfirmation(
    rpc: TronRpcClient,
    txId: string,
    options?: { timeout?: number; interval?: number },
): Promise<void> {
    const timeout = options?.timeout ?? 120_000
    const interval = options?.interval ?? 3_000
    const start = Date.now()

    while (Date.now() - start < timeout) {
        const info = await rpc.getTransactionInfoById(txId)
        if (info) {
            if (info.result === 'FAILED' || info.receipt?.result === 'REVERT') {
                throw new Error(`Transaction reverted: ${txId}`)
            }
            return
        }
        await new Promise(r => setTimeout(r, interval))
    }
    throw new Error(`Transaction confirmation timeout after ${timeout}ms: ${txId}`)
}
