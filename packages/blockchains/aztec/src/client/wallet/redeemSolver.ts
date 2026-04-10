import { AztecAddress } from '@aztec/aztec.js/addresses'
import { getContractInstanceFromInstantiationParams } from '@aztec/aztec.js/contracts'
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee'
import { Fr } from '@aztec/aztec.js/fields'
import type { AztecNode } from '@aztec/aztec.js/node'
import type { Wallet } from '@aztec/aztec.js/wallet'
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC'
import { hexToBytes } from '@train-protocol/sdk'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import { TokenContract } from '../../artifacts/Token'
import type { AztecSigner } from '../../types'
import { getContractInstance } from '../helpers'

// ── FPC Helpers (private to redeemSolver) ─────────────────────────────

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
    await wallet.registerContract(fpcInstance, SponsoredFPCContract.artifact)
}

// ── Main ──────────────────────────────────────────────────────────────

export async function redeemSolver(
    signer: AztecSigner,
    rpcUrl: string,
    params: RedeemSolverParams,
    node: AztecNode,
    sponsoredFPCInstance?: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>>,
): Promise<{ hash: string; fpcInstance: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>> }> {
    try {
        const fpcInstance = await getSponsoredFPCInstance(sponsoredFPCInstance)
        const feeOptions = await createFeeOptions(fpcInstance)

        const { contract, node: contractNode } = await getContractInstance(params.contractAddress, signer, node)
        const accounts = await signer.wallet.getAccounts()
        const senderAddress = accounts[0].item

        // Register Token contract if provided (needed for redeem)
        if (params.destinationAsset?.contract) {
            const tokenAddress = AztecAddress.fromString(params.destinationAsset.contract)
            const tokenInstance = await contractNode.getContract(tokenAddress)
            if (!tokenInstance) {
                throw new Error(
                    `Token contract not found at ${tokenAddress.toString()} on node ${rpcUrl}`,
                )
            }
            await signer.wallet.registerContract(tokenInstance, TokenContract.artifact)
            await signer.wallet.registerSender(AztecAddress.fromString(params.contractAddress))
        }

        await registerSponsoredFPC(signer.wallet, fpcInstance)

        const hashlockBytes = hexToBytes(params.id, 32)

        const secretHex = typeof params.secret === 'bigint'
            ? '0x' + params.secret.toString(16).padStart(64, '0')
            : String(params.secret)
        const secretBytes = hexToBytes(secretHex, 32)

        const txTimeout = 120000

        const tx = await contract.methods
            .redeem_solver(hashlockBytes, BigInt(params.index ?? 1), secretBytes)
            .send({
                from: senderAddress,
                fee: feeOptions,
                wait: { timeout: txTimeout, dontThrowOnRevert: true },
            })

        if (tx.receipt.hasExecutionReverted()) {
            throw new Error(`redeem_solver reverted: ${tx.receipt.error ?? 'unknown error'}`)
        }

        return {
            hash: tx.receipt.txHash?.toString() ?? String(tx),
            fpcInstance,
        }
    } catch (error) {
        console.error('Error in redeemSolver:', error)
        throw error
    }
}
