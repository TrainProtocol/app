import { AztecAddress } from '@aztec/aztec.js/addresses'
import { SetPublicAuthwitContractInteraction } from '@aztec/aztec.js/authorization'
import { Fr } from '@aztec/aztec.js/fields'
import type { AztecNode } from '@aztec/aztec.js/node'
import { parseUnits, hexToBytes } from '@train-protocol/sdk'
import type { UserLockParams } from '@train-protocol/sdk'
import { TokenContract } from '../../artifacts/Token'
import { TrainContract } from '../../artifacts/Train'
import type { AztecSigner, AztecTransactionRequest } from '../../types'
import { registerContractCompat, strToBytes } from '../helpers'

/**
 * Build the pair of `ContractFunctionInteraction`s required for a user lock:
 *   - public-authwit authorization for the token transfer
 *   - the `user_lock` call itself
 *
 * Both must be sent together via `BatchCall` (one wallet confirmation).
 * Registers the Train + Token contracts on the wallet as a side effect —
 * Aztec requires this before `.at(...)` can be called.
 */
export async function buildUserLockTx(
    signer: AztecSigner,
    rpcUrl: string,
    params: UserLockParams,
    node: AztecNode,
): Promise<AztecTransactionRequest[]> {
    const accounts = await signer.wallet.getAccounts()
    const senderAddress = accounts[0].item

    const trainAddress = AztecAddress.fromStringUnsafe(params.atomicContract)
    const tokenAddress = AztecAddress.fromStringUnsafe(params.sourceAsset.contract!)

    const trainInstance = await node.getContract(trainAddress)
    if (!trainInstance) throw new Error('Train contract not found')
    await registerContractCompat(signer.wallet, trainInstance, TrainContract.artifact)
    const train = TrainContract.at(trainAddress, signer.wallet)

    const tokenInstance = await node.getContract(tokenAddress)
    if (!tokenInstance) {
        throw new Error(
            `Token contract not found at ${tokenAddress.toString()} on node ${rpcUrl}`,
        )
    }
    await registerContractCompat(signer.wallet, tokenInstance, TokenContract.artifact)
    const token = TokenContract.at(tokenAddress, signer.wallet)

    const amount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)

    const transferNonce = Fr.random()
    const publicAction = token.methods.transfer_public_to_public(
        senderAddress,
        trainAddress,
        amount,
        transferNonce,
    )

    const setPublicAuthwit = await SetPublicAuthwitContractInteraction.create(
        signer.wallet,
        senderAddress,
        { caller: trainAddress, action: publicAction },
        true,
    )

    const userLockInteraction = train.methods.user_lock(
        hexToBytes(params.hashlock, 32),
        amount,
        transferNonce,
        params.rewardAmount ? BigInt(params.rewardAmount) : 0n,
        params.timelockDelta ?? 40,
        params.rewardTimelockDelta ?? 0,
        params.quoteExpiry,
        senderAddress,
        AztecAddress.fromStringUnsafe(params.srcSolverAddress),
        tokenAddress,
        params.payoutCurve
            ? AztecAddress.fromStringUnsafe(params.payoutCurve)
            : AztecAddress.ZERO,
        strToBytes('', 128),
        strToBytes(params.rewardToken || '', 90),
        strToBytes(params.rewardRecipient || '', 90),
        strToBytes(params.sourceChain, 30),
        strToBytes(params.destinationChain, 30),
        strToBytes(params.destinationAddress, 90),
        BigInt(params.destinationAmount),
        strToBytes(params.destinationAsset.contract, 90),
        strToBytes(params.nonce.toString() ?? '', 256),
        strToBytes(params.solverData ?? '', 256),
    )

    return [setPublicAuthwit, userLockInteraction]
}
