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

function hexToUint8Array(hex: string): Uint8Array {
    const clean = hex.replace('0x', '')
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
    }
    return bytes
}

function secretToUint8Array(secret: string | bigint): Uint8Array {
    if (typeof secret === 'bigint') {
        return hexToUint8Array(secret.toString(16).padStart(64, '0'))
    }
    return hexToUint8Array(secret.replace('0x', ''))
}

function writeBigUInt64LE(value: bigint): Uint8Array {
    const buf = new Uint8Array(8)
    const view = new DataView(buf.buffer)
    view.setBigUint64(0, value, true)
    return buf
}

const encoder = new TextEncoder()

export const userLockTransactionBuilder = async (params: UserLockParams): Promise<TransactionResult> => {
    const { connection, program, walletPublicKey } = params

    if (!walletPublicKey) throw new Error("Wallet not connected")
    if (!params.srcLpAddress) throw new Error("No LP address")

    const hashlock = hexToUint8Array(params.hashlock.replace('0x', ''))
    const bnAmount = toBaseUnits(params.amount, params.decimals)
    const bnDstAmount = toBaseUnits(params.destinationAmount, params.decimals)
    const bnRewardAmount = toBaseUnits(params.rewardAmount || '0', params.decimals)
    const bnTimelockDelta = new BN(params.timelockDelta || 0)
    const bnRewardTimelockDelta = new BN(params.rewardTimelockDelta || 0)
    const bnQuoteExpiry = new BN(params.quoteExpiry)
    const lpPublicKey = new PublicKey(params.srcLpAddress)
    const hashlockArray = Array.from(hashlock)
    const userData = params.nonce != null ? encoder.encode(params.nonce.toString()) : new Uint8Array(0)
    const solverDataBytes = params.solverData ? encoder.encode(params.solverData) : new Uint8Array(0)

    const [userLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("user_lock"), hashlock],
        program.programId
    )

    const tx = new Transaction()

    if (params.sourceAsset.contractAddress && params.sourceAsset.contractAddress !== NATIVE_SOL_ADDRESS) {
        const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenMint = new PublicKey(params.sourceAsset.contractAddress)
        const senderTokenAccount = await getAssociatedTokenAddress(tokenMint, walletPublicKey)
        const [vault] = PublicKey.findProgramAddressSync(
            [encoder.encode("user_vault"), hashlock],
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
    const hashlockBytes = hexToUint8Array(params.id.replace('0x', ''))
    const hashlockArray = Array.from(hashlockBytes)

    const [userLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("user_lock"), hashlockBytes],
        program.programId
    )

    let refundIx: TransactionInstruction
    if (params.sourceAsset.contractAddress && params.sourceAsset.contractAddress !== NATIVE_SOL_ADDRESS) {
        const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenMint = new PublicKey(params.sourceAsset.contractAddress)
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

    return { transaction: tx, blockhash, lastValidBlockHeight }
}

export const redeemSolverTransactionBuilder = async (params: RedeemSolverTxParams): Promise<TransactionResult> => {
    const { connection, program, walletPublicKey } = params
    const hashlockBytes = hexToUint8Array(params.id.replace('0x', ''))
    const hashlockArray = Array.from(hashlockBytes)
    const secretArray = Array.from(secretToUint8Array(params.secret))
    const lockIndexNum = params.index ?? 1
    const lockIndex = new BN(lockIndexNum)

    const indexBytes = writeBigUInt64LE(BigInt(lockIndexNum))

    const [solverLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("solver_lock"), hashlockBytes, indexBytes],
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
            [encoder.encode("solver_vault"), hashlockBytes, indexBytes],
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
