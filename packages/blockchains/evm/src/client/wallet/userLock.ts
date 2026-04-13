import { AbiFunction } from 'ox'
import { parseUnits, toHex32 } from '@train-protocol/sdk'
import type { UserLockParams, AtomicResult } from '@train-protocol/sdk'
import { htlcFunctions, erc20Functions } from '../../abi.js'
import type { JsonRpcClient } from '../../rpc.js'
import type { EvmSigner, RpcTransactionReceipt } from '../../types.js'
import { ZERO_ADDRESS } from '../../constants.js'
import { decodeContractError, hex } from '../../utils.js'

export async function userLock(
    rpc: JsonRpcClient,
    signer: EvmSigner,
    params: UserLockParams,
): Promise<AtomicResult> {
    const { sourceAsset, sourceAddress } = params

    const parsedAmount = parseUnits(params.amount.toString(), sourceAsset.decimals)
    const tokenAddress = sourceAsset.contract || ZERO_ADDRESS
    const isNativeToken = !sourceAsset.contract || sourceAsset.contract === ZERO_ADDRESS

    if (!isNativeToken) {
        await ensureERC20Allowance(
            rpc,
            signer,
            sourceAsset.contract!,
            sourceAddress,
            params.atomicContract,
            parsedAmount,
        )
    }

    const userData = toHex32(BigInt(params.nonce))
    const calldata = AbiFunction.encodeData(htlcFunctions.userLock, [
        {
            hashlock: hex(params.hashlock),
            amount: parsedAmount,
            rewardAmount: params.rewardAmount || 0n,
            timelockDelta: params.timelockDelta,
            rewardTimelockDelta: params.rewardTimelockDelta ?? 0,
            quoteExpiry: params.quoteExpiry,
            sender: hex(params.sourceAddress),
            recipient: hex(params.srcSolverAddress),
            token: hex(tokenAddress),
            rewardToken: params.rewardToken ?? '',
            rewardRecipient: params.rewardRecipient ?? '',
            srcChain: params.sourceChain || '',
        },
        {
            dstChain: params.destinationChain,
            dstAddress: params.destinationAddress,
            dstAmount: params.destinationAmount,
            dstToken: params.destinationAsset.contract,
        },
        hex(userData),
        hex(params.solverData || '0x'),
    ])

    try {
        await rpc.ethCall(
            params.atomicContract,
            calldata,
            sourceAddress,
            isNativeToken ? parsedAmount : undefined,
        )

        const hash = await signer.sendTransaction({
            to: params.atomicContract,
            data: calldata,
            value: isNativeToken ? parsedAmount : undefined,
        })

        return { hash, hashlock: params.hashlock, nonce: params.nonce }
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in userLock:', error)
        throw error
    }
}

async function ensureERC20Allowance(
    rpc: JsonRpcClient,
    signer: EvmSigner,
    tokenAddress: string,
    owner: string,
    spender: string,
    requiredAmount: bigint,
): Promise<void> {
    const allowanceData = AbiFunction.encodeData(erc20Functions.allowance, [hex(owner), hex(spender)])
    const allowanceRaw = await rpc.ethCall(tokenAddress, allowanceData)
    const allowance = AbiFunction.decodeResult(erc20Functions.allowance, hex(allowanceRaw))

    if (allowance >= requiredAmount) return

    const approveData = AbiFunction.encodeData(erc20Functions.approve, [hex(spender), requiredAmount])
    const approveHash = await signer.sendTransaction({ to: tokenAddress, data: approveData })
    await waitForReceipt(rpc, approveHash)
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
