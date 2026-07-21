import { cairo, CallData, byteArray } from 'starknet'
import { parseUnits } from '@train-protocol/sdk'
import type { UserLockParams } from '@train-protocol/sdk'
import type { StarknetTransactionRequest } from '../../types.js'
import { ZERO_ADDRESS } from '../../constants.js'

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
                payout_curve_data: byteArray.byteArrayFromString(''),
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
