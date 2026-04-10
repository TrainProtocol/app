import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import type { RefundParams } from '@train-protocol/sdk'
import type { SolanaSigner } from '../../types.js'
import { refundTransactionBuilder } from '../../transactionBuilder.js'

export async function refund(
    connection: Connection,
    signer: SolanaSigner,
    params: RefundParams,
    program: Program,
): Promise<string> {
    if (!params.contractAddress) throw new Error('No contract address')

    const walletPublicKey = new PublicKey(signer.publicKey)

    try {
        const { transaction, blockhash, lastValidBlockHeight } = await refundTransactionBuilder({
            ...params,
            connection,
            program,
            walletPublicKey,
        })

        const signature = await signer.sendTransaction(transaction)

        const res = await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature })
        if (res?.value.err) {
            throw new Error(res.value.err.toString())
        }

        return signature
    } catch (error: any) {
        console.error('[SolanaHTLC] refund failed', error?.message ?? error, error?.logs ?? [])
        throw error
    }
}
