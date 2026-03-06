import { Connection, PublicKey, Transaction } from "@solana/web3.js"
import { BN, Idl, Program } from "@coral-xyz/anchor"

export type UserLockParams = {
    connection: Connection
    program: Program<Idl>
    walletPublicKey: PublicKey
    hashlock: Buffer
    sourceChain: string
    destinationChain: string
    destinationAsset: string
    destinationAddress: string
    destinationAmount: string
    lpAddress: string
    sourceAsset: { symbol: string; contractAddress?: string | null }
    amount: string
    decimals: number
    timelockDelta: number
    quoteExpiry: number
    rewardAmount: string
    rewardToken: string
    rewardRecipient: string
    rewardTimelockDelta: number
    solverData?: string
    nonce?: number
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
    const {
        connection, program, walletPublicKey, hashlock,
        sourceChain, destinationChain, destinationAsset, destinationAddress, destinationAmount,
        lpAddress, sourceAsset, amount, decimals,
        timelockDelta, quoteExpiry, rewardAmount, rewardToken, rewardRecipient, rewardTimelockDelta,
        solverData, nonce,
    } = params

    if (!walletPublicKey) throw new Error("Wallet not connected")
    if (!lpAddress) throw new Error("No LP address")

    const bnAmount = toBaseUnits(amount, decimals)
    const bnDstAmount = toBaseUnits(destinationAmount, decimals)
    const bnRewardAmount = toBaseUnits(rewardAmount || '0', decimals)
    const bnTimelockDelta = new BN(timelockDelta)
    const bnRewardTimelockDelta = new BN(rewardTimelockDelta)
    const bnQuoteExpiry = new BN(quoteExpiry)
    const lpPublicKey = new PublicKey(lpAddress)
    const hashlockArray = Array.from(hashlock)
    const userData = nonce != null ? Buffer.from(nonce.toString(), 'utf8') : Buffer.from([])
    const solverDataBytes = solverData ? Buffer.from(solverData, 'utf8') : Buffer.from([])

    const [userLockPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_lock"), hashlock],
        program.programId
    )

    const tx = new Transaction()

    if (sourceAsset.contractAddress) {
        const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenMint = new PublicKey(sourceAsset.contractAddress)
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
                sourceChain, destinationChain, destinationAddress,
                bnDstAmount, destinationAsset,
                bnRewardAmount, rewardToken, rewardRecipient, bnRewardTimelockDelta,
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
                sourceChain, destinationChain, destinationAddress,
                bnDstAmount, destinationAsset,
                bnRewardAmount, rewardToken, rewardRecipient, bnRewardTimelockDelta,
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
