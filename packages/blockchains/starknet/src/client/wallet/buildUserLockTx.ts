import { cairo, CallData, byteArray } from 'starknet'
import { normalizePayoutCurveData, parseUnits } from '@train-protocol/sdk'
import type { UserLockParams } from '@train-protocol/sdk'
import type { StarknetTransactionRequest } from '../../types.js'
import { ZERO_ADDRESS } from '../../constants.js'

function payoutCurveByteArray(value: string | undefined) {
    const normalized = normalizePayoutCurveData(value ?? '0x').slice(2)
    const bytes = normalized.match(/.{2}/g) ?? []
    const completeChunks = Math.floor(bytes.length / 31)
    const data = Array.from({ length: completeChunks }, (_, index) =>
        `0x${bytes.slice(index * 31, (index + 1) * 31).join('')}`,
    )
    const remainder = bytes.slice(completeChunks * 31)
    return {
        data,
        pending_word: remainder.length ? `0x${remainder.join('')}` : '0x0',
        pending_word_len: remainder.length,
    }
}

export function buildUserLockTx(params: UserLockParams): StarknetTransactionRequest {
    const parsedAmount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)
    const tokenAddress = params.sourceAsset.contract || ZERO_ADDRESS

    return {
        contractAddress: params.atomicContract,
        entrypoint: 'user_lock',
        calldata: CallData.compile([
            {
                hashlock: cairo.uint256(BigInt(params.hashlock)),
                amount: cairo.uint256(parsedAmount),
                reward_amount: cairo.uint256(params.rewardAmount ? BigInt(params.rewardAmount) : 0n),
                timelock_delta: params.timelockDelta,
                reward_timelock_delta: params.rewardTimelockDelta,
                quote_expiry: params.quoteExpiry,
                recipient: params.srcSolverAddress,
                token: tokenAddress,
                reward_token: byteArray.byteArrayFromString(params.rewardToken ?? ''),
                reward_recipient: byteArray.byteArrayFromString(params.rewardRecipient ?? ''),
                src_chain: byteArray.byteArrayFromString(params.sourceChain || ''),
                refund_to: params.sourceAddress,
                payout_curve: params.payoutCurve || ZERO_ADDRESS,
                payout_curve_data: payoutCurveByteArray(params.payoutCurveData),
            },
            {
                dst_chain: byteArray.byteArrayFromString(params.destinationChain),
                dst_address: byteArray.byteArrayFromString(params.destinationAddress),
                dst_amount: cairo.uint256(BigInt(params.destinationAmount)),
                dst_token: byteArray.byteArrayFromString(params.destinationAsset.contract),
            },
            byteArray.byteArrayFromString(String(params.nonce)),
            byteArray.byteArrayFromString(params.solverData || ''),
        ]),
    }
}
