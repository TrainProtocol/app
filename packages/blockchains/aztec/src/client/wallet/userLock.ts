import { AztecAddress } from '@aztec/aztec.js/addresses'
import { SetPublicAuthwitContractInteraction } from '@aztec/aztec.js/authorization'
import { BatchCall, getContractInstanceFromInstantiationParams } from '@aztec/aztec.js/contracts'
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee'
import { Fr } from '@aztec/aztec.js/fields'
import type { AztecNode } from '@aztec/aztec.js/node'
import type { Wallet } from '@aztec/aztec.js/wallet'
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC'
import { parseUnits, hexToBytes } from '@train-protocol/sdk'
import type { UserLockParams, AtomicResult } from '@train-protocol/sdk'
import { TokenContract } from '../../artifacts/Token'
import { TrainContract } from '../../artifacts/Train'
import type { AztecSigner } from '../../types'
import { registerContractWithArtifactFallback, strToBytes } from '../helpers'

// ── FPC Helpers (private to userLock) ─────────────────────────────────

async function getSponsoredFPCInstance(
    cached?: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>>,
) {
    if (cached) return cached
    return getContractInstanceFromInstantiationParams(
        SponsoredFPCContract.artifact,
        { salt: new Fr(0) },
    )
}

async function createFeeOptions(
    fpcInstance: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>>,
) {
    return {
        paymentMethod: new SponsoredFeePaymentMethod(fpcInstance.address),
    }
}

async function registerSponsoredFPC(
    wallet: Wallet,
    fpcInstance: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>>,
): Promise<void> {
    await registerContractWithArtifactFallback(wallet, fpcInstance, SponsoredFPCContract.artifact)
}

// ── Main ──────────────────────────────────────────────────────────────

export async function userLock(
    signer: AztecSigner,
    rpcUrl: string,
    params: UserLockParams,
    node: AztecNode,
    sponsoredFPCInstance?: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>>,
): Promise<{ result: AtomicResult; fpcInstance: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>> }> {
    try {
        const fpcInstance = await getSponsoredFPCInstance(sponsoredFPCInstance)
        const feeOptions = await createFeeOptions(fpcInstance)

        const accounts = await signer.wallet.getAccounts()
        const senderAddress = accounts[0].item

        const trainAddress = AztecAddress.fromString(params.atomicContract)
        const tokenAddress = AztecAddress.fromString(params.sourceAsset.contract!)

        // Register Train contract
        const trainInstance = await node.getContract(trainAddress)
        if (!trainInstance) throw new Error('Train contract not found')
        await registerContractWithArtifactFallback(signer.wallet, trainInstance, TrainContract.artifact)
        const train = TrainContract.at(trainAddress, signer.wallet)

        // Register Token contract
        const tokenInstance = await node.getContract(tokenAddress)
        if (!tokenInstance) {
            throw new Error(
                `Token contract not found at ${tokenAddress.toString()} on node ${rpcUrl}`,
            )
        }
        await registerContractWithArtifactFallback(signer.wallet, tokenInstance, TokenContract.artifact)
        const token = TokenContract.at(tokenAddress, signer.wallet)

        const amount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)

        // Authorize public token transfer
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

        // Batch authwit + user_lock into a single transaction (one wallet confirmation)
        const userLockInteraction = train.methods.user_lock(
            hexToBytes(params.hashlock, 32),
            amount,
            transferNonce,
            params.rewardAmount ? BigInt(params.rewardAmount) : 0n,
            params.timelockDelta ?? 40,
            params.rewardTimelockDelta ?? 0,
            params.quoteExpiry,
            senderAddress,
            AztecAddress.fromString(params.srcSolverAddress),
            tokenAddress,
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

        await registerSponsoredFPC(signer.wallet, fpcInstance)

        const batch = new BatchCall(signer.wallet, [setPublicAuthwit, userLockInteraction])
        const txTimeout = 120000
        const tx = await batch.send({
            from: senderAddress,
            fee: feeOptions,
            wait: { timeout: txTimeout, dontThrowOnRevert: true },
        })

        if (tx.receipt.hasExecutionReverted()) {
            throw new Error(`user_lock reverted: ${tx.receipt.error ?? 'unknown error'}`)
        }

        return {
            result: {
                hash: tx.receipt.txHash?.toString() ?? String(tx),
                hashlock: params.hashlock,
                nonce: params.nonce,
            },
            fpcInstance,
        }
    } catch (error) {
        console.error('Error in userLock:', error)
        throw error
    }
}
