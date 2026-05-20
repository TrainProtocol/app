import { BN, Program } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import type { RedeemSolverParams } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from '../../constants.js'
import { encoder, hexToUint8Array, writeBigUInt64LE } from '../../utils.js'

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
    const lockIndexNum = params.index ?? 1
    const lockIndex = new BN(lockIndexNum)
    const indexBytes = writeBigUInt64LE(BigInt(lockIndexNum))

    const [solverLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode('solver_lock'), hashlockBytes, indexBytes],
        program.programId,
    )

    const solverLockAccount = await (program.account as any).solverLock.fetch(solverLockPda)
    const rewardRecipient = new PublicKey(solverLockAccount.rewardRecipient)
    const sender = new PublicKey(solverLockAccount.sender)
    const recipient = params.destinationAddress ? new PublicKey(params.destinationAddress) : walletPublicKey

    let tx: Transaction

    const asset = params.destinationAsset
    if (asset.contract && asset.contract !== NATIVE_SOL_ADDRESS) {
        const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenMint = new PublicKey(asset.contract)
        const [vault] = PublicKey.findProgramAddressSync(
            [encoder.encode('solver_vault'), hashlockBytes, indexBytes],
            program.programId,
        )
        const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipient)
        const rewardRecipientTokenAccount = await getAssociatedTokenAddress(tokenMint, rewardRecipient)
        const callerTokenAccount = await getAssociatedTokenAddress(tokenMint, walletPublicKey)

        tx = await program.methods
            .redeemSolverToken(hashlockArray, lockIndex, secretArray)
            .accounts({
                caller: walletPublicKey,
                solverLock: solverLockPda,
                recipient,
                rewardRecipient,
                tokenMint,
                vault,
                recipientTokenAccount,
                rewardRecipientTokenAccount,
                callerTokenAccount,
                sender,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .transaction()
    } else {
        tx = await program.methods
            .redeemSolverSol(hashlockArray, lockIndex, secretArray)
            .accounts({
                caller: walletPublicKey,
                solverLock: solverLockPda,
                recipient,
                rewardRecipient,
            })
            .transaction()
    }

    const blockHash = await connection.getLatestBlockhash()
    tx.recentBlockhash = blockHash.blockhash
    tx.lastValidBlockHeight = blockHash.lastValidBlockHeight
    tx.feePayer = walletPublicKey

    return tx
}
