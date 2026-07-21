import { BN, Program } from '@coral-xyz/anchor'
import { Connection, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, Transaction } from '@solana/web3.js'
import type { UserLockParams } from '@train-protocol/sdk'
import { parseUnits } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from '../../constants.js'
import { encoder, hexToUint8Array } from '../../utils.js'
import { resolvePayoutCurve, resolveTokenProgramId } from '../helpers.js'

function dataBytes(value: string | undefined): Buffer {
    if (!value) return Buffer.alloc(0)
    if (/^0x[0-9a-f]*$/i.test(value)) {
        return Buffer.from(value.slice(2), 'hex')
    }
    return Buffer.from(value)
}

export async function buildUserLockTx(
    connection: Connection,
    program: Program,
    walletPublicKey: PublicKey,
    params: UserLockParams,
): Promise<Transaction> {
    if (!params.atomicContract) throw new Error('No contract address')
    if (!params.srcSolverAddress) throw new Error('No Solver address')
    if (params.nonce == null) throw new Error('No nonce')
    if (!params.solverData) throw new Error('No solver data')

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
    const solverDataBytes = dataBytes(params.solverData)
    const payoutCurve = resolvePayoutCurve(params.payoutCurve)
    const lockParams = {
        hashlock: hashlockArray,
        amount: bnAmount,
        timelockDelta: bnTimelockDelta,
        quoteExpiry: bnQuoteExpiry,
        recipient: lpPublicKey,
        refundTo: new PublicKey(params.sourceAddress),
        payoutCurve: payoutCurve.address,
        payoutCurveData: Buffer.alloc(0),
        srcChain: params.sourceChain,
        dstChain: params.destinationChain,
        dstAddress: params.destinationAddress,
        dstAmount: bnDstAmount,
        dstToken: params.destinationAsset.contract ?? '',
        rewardAmount: bnRewardAmount,
        rewardToken: params.rewardToken ?? '',
        rewardRecipient: params.rewardRecipient ?? '',
        rewardTimelockDelta: bnRewardTimelockDelta,
    }

    const [userLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode('user_lock'), hashlock],
        program.programId,
    )

    const tx = new Transaction()

    if (params.sourceAsset.contract && params.sourceAsset.contract !== NATIVE_SOL_ADDRESS) {
        const { getAssociatedTokenAddress } = await import('@solana/spl-token')
        const tokenMint = new PublicKey(params.sourceAsset.contract)
        const tokenProgram = await resolveTokenProgramId(connection, tokenMint)
        const senderTokenAccount = await getAssociatedTokenAddress(tokenMint, walletPublicKey, false, tokenProgram)
        const [vault] = PublicKey.findProgramAddressSync(
            [encoder.encode('user_vault'), hashlock],
            program.programId,
        )

        const lockTx = await program.methods
            .userLockToken(
                lockParams,
                userData, solverDataBytes,
            )
            .accounts({
                payer: walletPublicKey,
                sender: walletPublicKey,
                userLock: userLockPda,
                tokenMint,
                senderTokenAccount,
                vault,
                payoutCurveProgram: payoutCurve.account ?? program.programId,
                tokenProgram,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .transaction()

        tx.add(lockTx)
    } else {
        const lockTx = await program.methods
            .userLockSol(
                lockParams,
                userData, solverDataBytes,
            )
            .accounts({
                payer: walletPublicKey,
                sender: walletPublicKey,
                userLock: userLockPda,
                payoutCurveProgram: payoutCurve.account ?? program.programId,
                systemProgram: SystemProgram.programId,
            })
            .transaction()

        tx.add(lockTx)
    }

    const blockHash = await connection.getLatestBlockhash()
    tx.recentBlockhash = blockHash.blockhash
    tx.lastValidBlockHeight = blockHash.lastValidBlockHeight
    tx.feePayer = walletPublicKey

    return tx
}
