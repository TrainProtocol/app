import { Connection, PublicKey, Transaction } from "@solana/web3.js"
import { BN, Idl, Program } from "@coral-xyz/anchor"
import { UserLockParams as SdkUserLockParams } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from './types.js'

export type UserLockParams = SdkUserLockParams & {
    connection: Connection
    program: Program<Idl>
    walletPublicKey: PublicKey
}

export type TransactionResult = {
    transaction: Transaction
    blockhash: string
    lastValidBlockHeight: number
}

function toBaseUnits(amount: string, decimals: number): BN {
    if (!amount || !/^\d+(\.\d+)?$/.test(amount.trim())) {
        throw new Error(`Invalid amount: "${amount}"`)
    }
    const [int, frac = ''] = amount.split('.')
    const fracPadded = frac.padEnd(decimals, '0').slice(0, decimals)
    return new BN(int + fracPadded)
}

export const userLockTransactionBuilder = async (params: UserLockParams): Promise<TransactionResult> => {
    const { connection, program, walletPublicKey } = params

    if (!walletPublicKey) throw new Error("Wallet not connected")
    if (!params.srcLpAddress) throw new Error("No LP address")

    const hashlock = Buffer.from(params.hashlock.replace('0x', ''), 'hex')
    const bnAmount = toBaseUnits(params.amount, params.decimals)
    const bnDstAmount = toBaseUnits(params.destinationAmount, params.decimals)
    const bnRewardAmount = toBaseUnits(params.rewardAmount || '0', params.decimals)
    const bnTimelockDelta = new BN(params.timelockDelta || 0)
    const bnRewardTimelockDelta = new BN(params.rewardTimelockDelta || 0)
    const bnQuoteExpiry = new BN(params.quoteExpiry)
    const lpPublicKey = new PublicKey(params.srcLpAddress)
    const hashlockArray = Array.from(hashlock)
    const userData = params.nonce != null ? Buffer.from(params.nonce.toString(), 'utf8') : Buffer.from([])
    const solverDataBytes = params.solverData ? Buffer.from(params.solverData, 'utf8') : Buffer.from([])

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
            [Buffer.from("vault"), hashlock],
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
