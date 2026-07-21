import { Program } from '@coral-xyz/anchor'
import {
    Connection,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js'
import type { RefundParams } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from '../../constants.js'
import { encoder, hexToUint8Array } from '../../utils.js'
import type { TypedProgramAccounts } from '../../types.js'
import { resolveTokenProgramId } from '../helpers.js'

export async function buildRefundTx(
    connection: Connection,
    program: Program,
    walletPublicKey: PublicKey,
    params: RefundParams,
): Promise<Transaction> {
    if (!params.contractAddress) throw new Error('No contract address')

    const hashlockBytes = hexToUint8Array(params.id.replace('0x', ''))
    const hashlockArray = Array.from(hashlockBytes)

    const [userLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode('user_lock'), hashlockBytes],
        program.programId,
    )
    const userLock = await (program.account as TypedProgramAccounts).userLock.fetch(userLockPda)
    const rentPayer = new PublicKey(userLock.rentPayer)
    const refundTo = new PublicKey(userLock.refundTo)
    const tokenMint = new PublicKey(userLock.tokenMint)

    let refundIx: TransactionInstruction
    if (!tokenMint.equals(new PublicKey(NATIVE_SOL_ADDRESS))) {
        const { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenProgram = await resolveTokenProgramId(connection, tokenMint)
        const refundToTokenAccount = await getAssociatedTokenAddress(tokenMint, refundTo, true, tokenProgram)
        const [vault] = PublicKey.findProgramAddressSync(
            [encoder.encode('user_vault'), hashlockBytes],
            program.programId,
        )

        refundIx = await program.methods
            .refundUserToken(hashlockArray)
            .accounts({
                caller: walletPublicKey,
                userLock: userLockPda,
                rentPayer,
                refundTo,
                tokenMint,
                vault,
                refundToTokenAccount,
                tokenProgram,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .instruction()
    } else {
        refundIx = await program.methods
            .refundUserSol(hashlockArray)
            .accounts({
                caller: walletPublicKey,
                userLock: userLockPda,
                rentPayer,
                refundTo,
                systemProgram: SystemProgram.programId,
            })
            .instruction()
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    const tx = new Transaction()
    tx.recentBlockhash = blockhash
    tx.lastValidBlockHeight = lastValidBlockHeight
    tx.feePayer = walletPublicKey
    tx.add(refundIx)
    return tx
}
