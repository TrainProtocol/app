import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import type { RefundParams } from '@train-protocol/sdk'
import type { SolanaSigner } from '../../types.js'
import { buildRefundTx } from './buildRefundTx.js'

export async function refund(
    connection: Connection,
    signer: SolanaSigner,
    params: RefundParams,
    program: Program,
): Promise<string> {
    const walletPublicKey = new PublicKey(signer.publicKey)
    const tx = await buildRefundTx(connection, program, walletPublicKey, params)

    try {
        const signed = await signer.signTransaction(tx)
        const signature = await connection.sendRawTransaction(signed.serialize())
        const res = await connection.confirmTransaction({
            blockhash: tx.recentBlockhash!,
            lastValidBlockHeight: tx.lastValidBlockHeight!,
            signature,
        })
        if (res?.value.err) {
            throw new Error(res.value.err.toString())
        }
        return signature
    } catch (error: any) {
        console.error('[SolanaHTLC] refund failed', error?.message ?? error, error?.logs ?? [])
        throw error
    }
}
