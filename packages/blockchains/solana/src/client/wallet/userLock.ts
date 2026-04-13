import { BN, Program } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import type { UserLockParams, AtomicResult } from '@train-protocol/sdk'
import { parseUnits } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from '../../constants.js'
import type { SolanaSigner } from '../../types.js'
import { encoder, hexToUint8Array } from '../../utils.js'

export async function userLock(
    connection: Connection,
    signer: SolanaSigner,
    params: UserLockParams,
    program: Program,
): Promise<AtomicResult> {
    if (!params.atomicContract) throw new Error('No contract address')

    const walletPublicKey = new PublicKey(signer.publicKey)

    if (!params.srcSolverAddress) throw new Error("No LP address")
    if (!params.nonce) throw new Error("No nonce")
    if (!params.solverData) throw new Error("No solver data")

    const hashlock = hexToUint8Array(params.hashlock.replace('0x', ''))
    const bnAmount = new BN(parseUnits(params.amount, params.sourceAsset.decimals).toString())
    const bnDstAmount = new BN(params.destinationAmount)
    const bnRewardAmount = new BN(params.rewardAmount || '0')
    const bnTimelockDelta = new BN(params.timelockDelta || 0)
    const bnRewardTimelockDelta = new BN(params.rewardTimelockDelta || 0)
    const bnQuoteExpiry = new BN(params.quoteExpiry)
    const lpPublicKey = new PublicKey(params.srcSolverAddress)
    const hashlockArray = Array.from(hashlock)
    const userData = Buffer.from(params.nonce.toString())
    const solverDataBytes = Buffer.from(params.solverData ?? '')

    const [userLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("user_lock"), hashlock],
        program.programId
    )

    const tx = new Transaction()

    if (params.sourceAsset.contract && params.sourceAsset.contract !== NATIVE_SOL_ADDRESS) {
        const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenMint = new PublicKey(params.sourceAsset.contract)
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
                bnDstAmount, params.destinationAsset.contract,
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
                bnDstAmount, params.destinationAsset.contract,
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

    let signature: string
    try {
        signature = await signer.sendTransaction(tx)
    } catch (e: any) {
        console.error('[SolanaHTLC] sendTransaction failed', e?.message ?? String(e), e?.logs ?? [])
        throw e
    }

    const res = await connection.confirmTransaction({
        blockhash: blockHash.blockhash,
        lastValidBlockHeight: blockHash.lastValidBlockHeight,
        signature,
    })

    if (res?.value.err) {
        console.error('[SolanaHTLC] confirmTransaction error', res.value.err.toString())
        throw new Error(res.value.err.toString())
    }

    return { hash: signature, hashlock: params.hashlock, nonce: params.nonce }
}
