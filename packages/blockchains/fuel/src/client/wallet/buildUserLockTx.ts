import { parseUnits } from '@train-protocol/sdk'
import type { UserLockParams } from '@train-protocol/sdk'
import type {
    FuelDestinationInfoInput,
    FuelSigner,
    FuelTransactionRequest,
    FuelUserLockInput,
} from '../../types.js'
import {
    dataBytes,
    identityFromAddress,
    optionalContractId,
    unixSecondsToTai64,
} from '../../utils.js'
import { buildContract, type BuiltUserLockArguments } from '../helpers.js'

export async function buildUserLockArguments(
    signer: FuelSigner,
    params: UserLockParams,
): Promise<BuiltUserLockArguments> {
    if (!params.atomicContract) throw new Error('No contract address')
    if (!params.srcSolverAddress) throw new Error('No solver address')
    if (params.nonce == null) throw new Error('No nonce')

    const amount = parseUnits(params.amount, params.sourceAsset.decimals)
    const assetId = params.sourceAsset.contract
        ? params.sourceAsset.contract
        : await signer.account.provider.getBaseAssetId()

    const lock: FuelUserLockInput = {
        hashlock: params.hashlock,
        timelock_delta: params.timelockDelta,
        quote_expiry: unixSecondsToTai64(params.quoteExpiry),
        recipient: identityFromAddress(params.srcSolverAddress),
        refund_to: identityFromAddress(params.sourceAddress),
        payout_curve: optionalContractId(params.payoutCurve),
        payout_curve_data: dataBytes(params.payoutCurveData),
        reward_amount: params.rewardAmount ?? '0',
        reward_timelock_delta: params.rewardTimelockDelta ?? 0,
        reward_token: params.rewardToken ?? '',
        reward_recipient: params.rewardRecipient ?? '',
        src_chain: params.sourceChain,
    }

    const destination: FuelDestinationInfoInput = {
        dst_chain: params.destinationChain,
        dst_address: params.destinationAddress,
        dst_amount: params.destinationAmount,
        dst_token: params.destinationAsset.contract ?? '',
    }

    return {
        lock,
        destination,
        userData: dataBytes(params.nonce.toString()),
        solverData: dataBytes(params.solverData),
        amount: amount.toString(),
        assetId,
    }
}

export async function buildUserLockTx(
    signer: FuelSigner,
    params: UserLockParams,
): Promise<FuelTransactionRequest> {
    const args = await buildUserLockArguments(signer, params)
    const contract = buildContract(params.atomicContract, signer.account)
    const scope = contract.functions
        .user_lock(args.lock, args.destination, args.userData, args.solverData)
        .callParams({ forward: [args.amount, args.assetId] })

    return scope.fundWithRequiredCoins()
}
