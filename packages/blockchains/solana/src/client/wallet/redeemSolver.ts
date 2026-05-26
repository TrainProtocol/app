import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import type { SolanaSigner } from '../../types.js'
import { buildRedeemSolverTx } from './buildRedeemSolverTx.js'

export async function redeemSolver(
    connection: Connection,
    signer: SolanaSigner,
    params: RedeemSolverParams,
    program: Program,
): Promise<string> {
    const walletPublicKey = new PublicKey(signer.publicKey)
    const tx = await buildRedeemSolverTx(connection, program, walletPublicKey, params)

    try {
        const signature = await signer.sendTransaction(tx)
        const res = await connection.confirmTransaction({
            blockhash: tx.recentBlockhash!,
            lastValidBlockHeight: tx.lastValidBlockHeight!,
            signature,
        })
        if (res?.value.err) {
            throw new Error(res.value.err.toString())
        }
        return signature
    } catch (error) {
        console.error('Error in redeemSolver:', error)
        throw error
    }
}
