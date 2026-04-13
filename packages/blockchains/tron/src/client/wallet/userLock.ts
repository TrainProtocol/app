import { AbiFunction } from 'ox'
import { parseUnits, toHex32 } from '@train-protocol/sdk'
import type { UserLockParams, AtomicResult } from '@train-protocol/sdk'
import { htlcFunctions, trc20Functions } from '../../abi.js'
import type { TronRpcClient } from '../../rpc.js'
import type { TronSigner } from '../../types.js'
import { ZERO_ADDRESS, DEFAULT_FEE_LIMIT, FUNCTION_SIGNATURES } from '../../constants.js'
import { toEvmHex, toTronHex } from '../../address.js'
import { decodeContractError, encodeParams, hex } from '../../utils.js'

export async function userLock(
    rpc: TronRpcClient,
    signer: TronSigner,
    params: UserLockParams,
): Promise<AtomicResult> {
    const { sourceAsset, sourceAddress } = params

    const parsedAmount = parseUnits(params.amount.toString(), sourceAsset.decimals)
    const tokenAddress = sourceAsset.contract || ZERO_ADDRESS
    const isNativeToken = !sourceAsset.contract || sourceAsset.contract === ZERO_ADDRESS

    const ownerHex = toTronHex(sourceAddress)
    const contractHex = toTronHex(params.atomicContract)

    if (!isNativeToken) {
        await ensureTRC20Allowance(
            rpc,
            signer,
            tokenAddress,
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
            sender: toEvmHex(params.sourceAddress),
            recipient: toEvmHex(params.srcSolverAddress),
            token: toEvmHex(tokenAddress),
            rewardToken: params.rewardToken ? toEvmHex(params.rewardToken) : hex(ZERO_ADDRESS),
            rewardRecipient: params.rewardRecipient ? toEvmHex(params.rewardRecipient) : hex(ZERO_ADDRESS),
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

    const parameter = encodeParams(calldata)

    try {
        // Simulate first
        await rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.userLock, parameter, ownerHex)

        // Build and sign
        const unsignedTx = await rpc.triggerSmartContract(
            contractHex,
            FUNCTION_SIGNATURES.userLock,
            parameter,
            ownerHex,
            isNativeToken ? Number(parsedAmount) : 0,
            DEFAULT_FEE_LIMIT,
        )

        const hash = await signer.signAndBroadcast(unsignedTx)
        return { hash, hashlock: params.hashlock, nonce: params.nonce }
    } catch (error) {
        const errorName = decodeContractError(error)
        if (errorName) throw new Error(`Contract error: ${errorName}`)
        console.error('Error in userLock:', error)
        throw error
    }
}

async function ensureTRC20Allowance(
    rpc: TronRpcClient,
    signer: TronSigner,
    tokenAddress: string,
    owner: string,
    spender: string,
    requiredAmount: bigint,
): Promise<void> {
    const tokenHex = toTronHex(tokenAddress)
    const ownerHex = toTronHex(owner)

    const allowanceCalldata = AbiFunction.encodeData(trc20Functions.allowance, [
        toEvmHex(owner),
        toEvmHex(spender),
    ])
    const aParam = encodeParams(allowanceCalldata)
    const allowanceRaw = await rpc.triggerConstantContract(tokenHex, FUNCTION_SIGNATURES.allowance, aParam, ownerHex)
    const allowance = AbiFunction.decodeResult(trc20Functions.allowance, hex('0x' + allowanceRaw))

    if (allowance >= requiredAmount) return

    const approveCalldata = AbiFunction.encodeData(trc20Functions.approve, [
        toEvmHex(spender),
        requiredAmount,
    ])
    const apParam = encodeParams(approveCalldata)
    const unsignedTx = await rpc.triggerSmartContract(
        tokenHex, FUNCTION_SIGNATURES.approve, apParam, ownerHex, 0, DEFAULT_FEE_LIMIT,
    )
    const txId = await signer.signAndBroadcast(unsignedTx)
    await waitForConfirmation(rpc, txId)
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
