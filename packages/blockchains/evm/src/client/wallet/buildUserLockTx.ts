import { AbiFunction } from 'ox'
import { parseUnits, toHex32 } from '@train-protocol/sdk'
import type { UserLockParams } from '@train-protocol/sdk'
import { htlcFunctions } from '../../abi.js'
import type { EvmTransactionRequest } from '../../types.js'
import { ZERO_ADDRESS } from '../../constants.js'
import { hex } from '../../utils.js'

export function buildUserLockTx(params: UserLockParams): EvmTransactionRequest {
    const { sourceAsset } = params

    const parsedAmount = parseUnits(params.amount.toString(), sourceAsset.decimals)
    const tokenAddress = sourceAsset.contract || ZERO_ADDRESS
    const isNativeToken = !sourceAsset.contract || sourceAsset.contract === ZERO_ADDRESS

    const userData = toHex32(BigInt(params.nonce))
    const data = AbiFunction.encodeData(htlcFunctions.userLock, [
        {
            hashlock: hex(params.hashlock),
            amount: parsedAmount,
            rewardAmount: params.rewardAmount || 0n,
            timelockDelta: params.timelockDelta,
            rewardTimelockDelta: params.rewardTimelockDelta ?? 0,
            quoteExpiry: params.quoteExpiry,
            recipient: hex(params.srcSolverAddress),
            refundTo: hex(params.sourceAddress),
            token: hex(tokenAddress),
            payoutCurve: hex(params.payoutCurve || ZERO_ADDRESS),
            payoutCurveData: hex('0x'),
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

    return {
        to: params.atomicContract,
        data,
        value: isNativeToken ? parsedAmount : undefined,
    }
}
