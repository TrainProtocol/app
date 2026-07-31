import { AbiFunction } from 'ox'
import { parseUnits, toHex32 } from '@train-protocol/sdk'
import type { UserLockParams } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { TronTransactionRequest } from '../../types.js'
import { ZERO_ADDRESS, DEFAULT_FEE_LIMIT, FUNCTION_SIGNATURES } from '../../constants.js'
import { toEvmHex, toTronHex } from '../../address.js'
import { encodeParams, hex } from '../../utils.js'

export function buildUserLockTx(params: UserLockParams): TronTransactionRequest {
    // The checked-in Tron contract ABI predates payout-policy fields. Never lock
    // user funds under a quote whose curve commitment this contract cannot encode.
    const payoutCurveData = params.payoutCurveData ?? '0x'
    if (params.payoutCurve || payoutCurveData !== '0x') {
        throw new Error('The configured Tron HTLC contract does not support payout-curve commitments')
    }

    const { sourceAsset } = params

    const parsedAmount = parseUnits(params.amount.toString(), sourceAsset.decimals)
    const tokenAddress = sourceAsset.contract || ZERO_ADDRESS
    const isNativeToken = !sourceAsset.contract || sourceAsset.contract === ZERO_ADDRESS

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

    return {
        contractAddress: toTronHex(params.atomicContract),
        functionSelector: FUNCTION_SIGNATURES.userLock,
        parameter: encodeParams(calldata),
        callValue: isNativeToken ? Number(parsedAmount) : 0,
        feeLimit: DEFAULT_FEE_LIMIT,
    }
}
