import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import type { RefundParams } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from '../../constants.js'
import type { SolanaSigner } from '../../types.js'
import { encoder, hexToUint8Array } from '../../utils.js'

export async function refund(
    connection: Connection,
    signer: SolanaSigner,
    params: RefundParams,
    program: Program,
): Promise<string> {
    if (!params.contractAddress) throw new Error('No contract address')

    const walletPublicKey = new PublicKey(signer.publicKey)
    const hashlockBytes = hexToUint8Array(params.id.replace('0x', ''))
    const hashlockArray = Array.from(hashlockBytes)

    const [userLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("user_lock"), hashlockBytes],
        program.programId
    )

    let refundIx: TransactionInstruction
    if (params.sourceAsset.contract && params.sourceAsset.contract !== NATIVE_SOL_ADDRESS) {
        const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenMint = new PublicKey(params.sourceAsset.contract)
        const senderTokenAccount = await getAssociatedTokenAddress(tokenMint, walletPublicKey)
        const [vault] = PublicKey.findProgramAddressSync(
            [encoder.encode("user_vault"), hashlockBytes],
            program.programId
        )

        refundIx = await program.methods
            .refundUserToken(hashlockArray)
            .accounts({
                caller: walletPublicKey,
                userLock: userLockPda,
                sender: walletPublicKey,
                tokenMint,
                vault,
                senderTokenAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .instruction()
    } else {
        refundIx = await program.methods
            .refundUserSol(hashlockArray)
            .accounts({
                caller: walletPublicKey,
                userLock: userLockPda,
                sender: walletPublicKey,
            })
            .instruction()
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    const tx = new Transaction()
    tx.recentBlockhash = blockhash
    tx.lastValidBlockHeight = lastValidBlockHeight
    tx.feePayer = walletPublicKey
    tx.add(refundIx)

    try {
        const signature = await signer.sendTransaction(tx)

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
