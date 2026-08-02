import { Program } from '@coral-xyz/anchor'
import {
    Connection,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SystemProgram,
    Transaction,
} from '@solana/web3.js'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from '../../constants.js'
import type { TypedProgramAccounts } from '../../types.js'
import { encoder, hexToUint8Array } from '../../utils.js'
import { resolveTokenProgramId } from '../helpers.js'

function secretToUint8Array(secret: string | bigint): Uint8Array {
    if (typeof secret === 'bigint') {
        return hexToUint8Array(secret.toString(16).padStart(64, '0'))
    }
    return hexToUint8Array(secret.replace('0x', ''))
}

export async function buildRedeemSolverTx(
    connection: Connection,
    program: Program,
    walletPublicKey: PublicKey,
    params: RedeemSolverParams,
): Promise<Transaction> {
    if (!params.contractAddress) throw new Error('No contract address')

    const hashlockBytes = hexToUint8Array(params.id.replace('0x', ''))
    const hashlockArray = Array.from(hashlockBytes)
    const secretArray = Array.from(secretToUint8Array(params.secret))
    const solver = new PublicKey(params.solverAddress)
    const solverBytes = solver.toBytes()

    const [solverLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode('solver_lock'), hashlockBytes, solverBytes],
        program.programId,
    )

    const solverLockAccount = await (program.account as TypedProgramAccounts).solverLock.fetch(solverLockPda)
    const rentPayer = new PublicKey(solverLockAccount.rentPayer)
    const rewardRecipient = new PublicKey(solverLockAccount.rewardRecipient)
    const recipient = new PublicKey(solverLockAccount.recipient)
    const refundTo = new PublicKey(solverLockAccount.refundTo)
    const payoutCurve = new PublicKey(solverLockAccount.payoutCurve)
    const hasPayoutCurve = !payoutCurve.equals(new PublicKey(NATIVE_SOL_ADDRESS))
    const payoutCurveProgram = hasPayoutCurve ? payoutCurve : program.programId
    const tokenMint = new PublicKey(solverLockAccount.tokenMint)
    const rewardTokenMint = new PublicKey(solverLockAccount.rewardTokenMint)

    let tx: Transaction

    if (!tokenMint.equals(new PublicKey(NATIVE_SOL_ADDRESS))) {
        const { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenProgram = await resolveTokenProgramId(connection, tokenMint)
        const [vault] = PublicKey.findProgramAddressSync(
            [encoder.encode('solver_vault'), hashlockBytes, solverBytes],
            program.programId,
        )
        const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipient, true, tokenProgram)
        const refundToTokenAccount = hasPayoutCurve
            ? await getAssociatedTokenAddress(tokenMint, refundTo, true, tokenProgram)
            : program.programId

        if (rewardTokenMint.equals(tokenMint)) {
            const rewardRecipientTokenAccount = await getAssociatedTokenAddress(tokenMint, rewardRecipient, true, tokenProgram)
            const callerTokenAccount = await getAssociatedTokenAddress(tokenMint, walletPublicKey, true, tokenProgram)

            tx = await program.methods
                .redeemSolverToken(hashlockArray, solver, secretArray)
                .accounts({
                    caller: walletPublicKey,
                    solverLock: solverLockPda,
                    rentPayer,
                    recipient,
                    rewardRecipient,
                    refundTo,
                    tokenMint,
                    vault,
                    recipientTokenAccount,
                    rewardRecipientTokenAccount,
                    callerTokenAccount,
                    refundToTokenAccount,
                    payoutCurveProgram,
                    tokenProgram,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .transaction()
        } else {
            const rewardTokenProgram = await resolveTokenProgramId(connection, rewardTokenMint)
            if (!rewardTokenProgram.equals(tokenProgram)) {
                throw new Error('Principal and reward mints use different Solana token programs')
            }

            const [rewardVault] = PublicKey.findProgramAddressSync(
                [encoder.encode('solver_reward_vault'), hashlockBytes, solverBytes],
                program.programId,
            )
            const rewardRecipientTokenAccount = await getAssociatedTokenAddress(
                rewardTokenMint,
                rewardRecipient,
                true,
                tokenProgram,
            )
            const callerRewardTokenAccount = await getAssociatedTokenAddress(
                rewardTokenMint,
                walletPublicKey,
                true,
                tokenProgram,
            )

            tx = await program.methods
                .redeemSolverTokenDiffReward(hashlockArray, solver, secretArray)
                .accounts({
                    caller: walletPublicKey,
                    solverLock: solverLockPda,
                    rentPayer,
                    recipient,
                    rewardRecipient,
                    refundTo,
                    tokenMint,
                    rewardTokenMint,
                    vault,
                    rewardVault,
                    recipientTokenAccount,
                    rewardRecipientTokenAccount,
                    callerRewardTokenAccount,
                    refundToTokenAccount,
                    payoutCurveProgram,
                    tokenProgram,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .transaction()
        }
    } else {
        tx = await program.methods
            .redeemSolverSol(hashlockArray, solver, secretArray)
            .accounts({
                caller: walletPublicKey,
                solverLock: solverLockPda,
                recipient,
                rewardRecipient,
                refundTo,
                payoutCurveProgram,
                systemProgram: SystemProgram.programId,
            })
            .transaction()
    }

    const blockHash = await connection.getLatestBlockhash()
    tx.recentBlockhash = blockHash.blockhash
    tx.lastValidBlockHeight = blockHash.lastValidBlockHeight
    tx.feePayer = walletPublicKey

    return tx
}
