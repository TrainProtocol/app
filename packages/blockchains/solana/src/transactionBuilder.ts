import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import { BN, Idl, Program } from "@coral-xyz/anchor"
import { UserLockParams as SdkUserLockParams, RefundParams, RedeemSolverParams, parseUnits } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from './constants.js'

type SolanaContext = {
    connection: Connection
    program: Program<Idl>
    walletPublicKey: PublicKey
}

export type UserLockParams = SdkUserLockParams & SolanaContext
export type RefundTxParams = RefundParams & SolanaContext
export type RedeemSolverTxParams = RedeemSolverParams & SolanaContext

export type TransactionResult = {
    transaction: Transaction
    blockhash: string
    lastValidBlockHeight: number
}

function toBaseUnits(amount: string, decimals: number): BN {
    return new BN(parseUnits(amount, decimals).toString())
}

function secretToBuffer(secret: string | bigint): Buffer {
    if (typeof secret === 'bigint') {
        return Buffer.from(secret.toString(16).padStart(64, '0'), 'hex')
    }
    return Buffer.from(secret.replace('0x', ''), 'hex')
}

export const userLockTransactionBuilder = async (params: UserLockParams): Promise<TransactionResult> => {
    const { connection, program, walletPublicKey } = params

    if (!walletPublicKey) throw new Error("Wallet not connected")
    if (!params.srcLpAddress) throw new Error("No LP address")
    if (!params.nonce) throw new Error("No nonce")
    if (!params.solverData) throw new Error("No solver data")

    const hashlock = Buffer.from(params.hashlock.replace('0x', ''), 'hex')
    const bnAmount = toBaseUnits(params.amount, params.sourceAsset.decimals)
    const bnDstAmount = new BN(params.destinationAmount)
    const bnRewardAmount = new BN(params.rewardAmount || '0')
    const bnTimelockDelta = new BN(params.timelockDelta || 0)
    const bnRewardTimelockDelta = new BN(params.rewardTimelockDelta || 0)
    const bnQuoteExpiry = new BN(params.quoteExpiry)
    const lpPublicKey = new PublicKey(params.srcLpAddress)
    const hashlockArray = Array.from(hashlock)
    const userData = Buffer.from(params.nonce.toString(), 'utf8')
    const solverDataBytes = Buffer.from(params.solverData, 'utf8')
    
    const [userLockPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_lock"), hashlock],
        program.programId
    )

    const tx = new Transaction()

    if (params.sourceAsset.contractAddress && params.sourceAsset.contractAddress !== NATIVE_SOL_ADDRESS) {
        const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenMint = new PublicKey(params.sourceAsset.contractAddress)
        const senderTokenAccount = await getAssociatedTokenAddress(tokenMint, walletPublicKey)
        const [vault] = PublicKey.findProgramAddressSync(
            [Buffer.from("user_vault"), hashlock],
            program.programId
        )

        const lockTx = await program.methods
            .userLockToken(
                hashlockArray,
                bnAmount, bnTimelockDelta, bnQuoteExpiry,
                walletPublicKey, lpPublicKey,
                params.sourceChain, params.destinationChain, params.destinationAddress,
                bnDstAmount, params.destinationAsset,
                bnRewardAmount, params.rewardToken ?? '', params.rewardRecipient ?? '', bnRewardTimelockDelta,
                userData, solverDataBytes
            )
            .accounts({
                signer: walletPublicKey,
                userLock: userLockPda,
                tokenMint,
                senderTokenAccount,
                vault,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .transaction()

        tx.add(lockTx)
    } else {
        const lockTx = await program.methods
            .userLockSol(
                hashlockArray,
                bnAmount, bnTimelockDelta, bnQuoteExpiry,
                walletPublicKey, lpPublicKey,
                params.sourceChain, params.destinationChain, params.destinationAddress,
                bnDstAmount, params.destinationAsset,
                bnRewardAmount, params.rewardToken ?? '', params.rewardRecipient ?? '', bnRewardTimelockDelta,
                userData, solverDataBytes
            )
            .accounts({
                signer: walletPublicKey,
                userLock: userLockPda,
            })
            .transaction()

        tx.add(lockTx)
    }

    const blockHash = await connection.getLatestBlockhash()
    tx.recentBlockhash = blockHash.blockhash
    tx.lastValidBlockHeight = blockHash.lastValidBlockHeight
    tx.feePayer = walletPublicKey

    return { transaction: tx, blockhash: blockHash.blockhash, lastValidBlockHeight: blockHash.lastValidBlockHeight }
}

export const refundTransactionBuilder = async (params: RefundTxParams): Promise<TransactionResult> => {
    const { connection, program, walletPublicKey } = params
    const hashlockBuffer = Buffer.from(params.id.replace('0x', ''), 'hex')
    const hashlockArray = Array.from(hashlockBuffer)

    const [userLockPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_lock"), hashlockBuffer],
        program.programId
    )

    let refundIx: TransactionInstruction
    if (params.sourceAsset.contractAddress && params.sourceAsset.contractAddress !== NATIVE_SOL_ADDRESS) {
        const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenMint = new PublicKey(params.sourceAsset.contractAddress)
        const senderTokenAccount = await getAssociatedTokenAddress(tokenMint, walletPublicKey)
        const [vault] = PublicKey.findProgramAddressSync(
            [Buffer.from("user_vault"), hashlockBuffer],
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

    return { transaction: tx, blockhash, lastValidBlockHeight }
}

export const redeemSolverTransactionBuilder = async (params: RedeemSolverTxParams): Promise<TransactionResult> => {
    const { connection, program, walletPublicKey } = params
    const hashlockBuffer = Buffer.from(params.id.replace('0x', ''), 'hex')
    const hashlockArray = Array.from(hashlockBuffer)
    const secretArray = Array.from(secretToBuffer(params.secret))
    const lockIndexNum = params.index ?? 1
    const lockIndex = new BN(lockIndexNum)

    const indexBuffer = Buffer.alloc(8)
    indexBuffer.writeBigUInt64LE(BigInt(lockIndexNum))

    const [solverLockPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("solver_lock"), hashlockBuffer, indexBuffer],
        program.programId
    )

    const solverLockAccount = await (program.account as any).solverLock.fetch(solverLockPda)
    const rewardRecipient = new PublicKey(solverLockAccount.rewardRecipient)
    const sender = new PublicKey(solverLockAccount.sender)
    const recipient = params.destinationAddress ? new PublicKey(params.destinationAddress) : walletPublicKey

    let tx: Transaction
    if (params.sourceAsset.contractAddress && params.sourceAsset.contractAddress !== NATIVE_SOL_ADDRESS) {
        const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenMint = new PublicKey(params.sourceAsset.contractAddress)
        const [vault] = PublicKey.findProgramAddressSync(
            [Buffer.from("solver_vault"), hashlockBuffer, indexBuffer],
            program.programId
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

    return { transaction: tx, blockhash: blockHash.blockhash, lastValidBlockHeight: blockHash.lastValidBlockHeight }
}
