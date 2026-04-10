import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import type { SolanaSigner } from '../../types.js'
import { redeemSolverTransactionBuilder } from '../../transactionBuilder.js'

export async function redeemSolver(
    connection: Connection,
    signer: SolanaSigner,
    params: RedeemSolverParams,
    program: Program,
): Promise<string> {
    if (!params.contractAddress) throw new Error('No contract address')

    const walletPublicKey = new PublicKey(signer.publicKey)

    try {
        const { transaction, blockhash, lastValidBlockHeight } = await redeemSolverTransactionBuilder({
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
    } catch (error) {
        console.error('Error in redeemSolver:', error)
        throw error
    }
}
