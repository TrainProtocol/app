import { getContractInstanceFromInstantiationParams } from '@aztec/aztec.js/contracts'
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee'
import { Fr } from '@aztec/aztec.js/fields'
import type { AztecNode } from '@aztec/aztec.js/node'
import type { Wallet } from '@aztec/aztec.js/wallet'
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC'
import { hexToBytes } from '@train-protocol/sdk'
import type { RefundParams } from '@train-protocol/sdk'
import type { AztecSigner } from '../../types'
import { getContractInstance } from '../helpers'

// ── FPC Helpers (private to refund) ───────────────────────────────────

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

export async function refund(
    signer: AztecSigner,
    params: RefundParams,
    node: AztecNode,
    sponsoredFPCInstance?: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>>,
): Promise<{ hash: string; fpcInstance: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>> }> {
    try {
        const fpcInstance = await getSponsoredFPCInstance(sponsoredFPCInstance)
        const feeOptions = await createFeeOptions(fpcInstance)

        const { contract } = await getContractInstance(params.contractAddress, signer, node)
        const accounts = await signer.wallet.getAccounts()
        const senderAddress = accounts[0].item

        await registerSponsoredFPC(signer.wallet, fpcInstance)

        const hashlockBytes = hexToBytes(params.id, 32)
        const txTimeout = 120000

        const tx = await contract.methods
            .refund_user(hashlockBytes)
            .send({
                from: senderAddress,
                fee: feeOptions,
                wait: { timeout: txTimeout, dontThrowOnRevert: true },
            })

        if (tx.receipt.hasExecutionReverted()) {
            throw new Error(`refund_user reverted: ${tx.receipt.error ?? 'unknown error'}`)
        }

        return {
            hash: tx.receipt.txHash?.toString() ?? String(tx),
            fpcInstance,
        }
    } catch (error) {
        console.error('Error in refund:', error)
        throw error
    }
}
