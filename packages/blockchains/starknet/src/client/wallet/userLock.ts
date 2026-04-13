import { cairo, CallData, Contract, byteArray, type Call } from 'starknet'
import { parseUnits } from '@train-protocol/sdk'
import type { UserLockParams, AtomicResult } from '@train-protocol/sdk'
import type { StarknetSigner } from '../../types.js'
import { ERC20_ABI } from '../../abis/ERC20.js'
import { ZERO_ADDRESS } from '../../constants.js'

export async function userLock(
    signer: StarknetSigner,
    params: UserLockParams,
): Promise<AtomicResult> {
    const parsedAmount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)
    const tokenAddress = params.sourceAsset.contract || ZERO_ADDRESS

    // ERC20 approval
    const erc20 = new Contract({ abi: ERC20_ABI, address: tokenAddress, providerOrAccount: signer.account })
    const approveCall: Call = erc20.populate("approve", [params.atomicContract, cairo.uint256(parsedAmount)])

    // Build user_lock call
    const userLockCall: Call = {
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
                sender: params.sourceAddress,
                recipient: params.srcSolverAddress,
                token: tokenAddress,
                reward_token: byteArray.byteArrayFromString(params.rewardToken ?? ''),
                reward_recipient: byteArray.byteArrayFromString(params.rewardRecipient ?? ''),
                src_chain: byteArray.byteArrayFromString(params.sourceChain || ''),
            },
            {
                dst_chain: byteArray.byteArrayFromString(params.destinationChain),
                dst_address: byteArray.byteArrayFromString(params.destinationAddress),
                dst_amount: cairo.uint256(BigInt(params.destinationAmount)),
                dst_token: byteArray.byteArrayFromString(params.destinationAsset.contract),
            },
            byteArray.byteArrayFromString(String(params.nonce)),  // userData — nonce timestamp for recovery
            byteArray.byteArrayFromString(params.solverData || ''),
        ]),
    }

    try {
        const { transaction_hash } = await signer.account.execute([approveCall, userLockCall])
        await signer.account.waitForTransaction(transaction_hash)

        return { hash: transaction_hash, hashlock: params.hashlock, nonce: params.nonce }
    } catch (error) {
        console.error('Error in userLock:', error)
        throw error
    }
}
