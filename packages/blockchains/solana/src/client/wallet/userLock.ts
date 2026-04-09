import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import type { UserLockParams, AtomicResult } from '@train-protocol/sdk'
import type { SolanaSigner } from '../../types.js'
import { userLockTransactionBuilder } from '../../transactionBuilder.js'

export async function userLock(
    connection: Connection,
    signer: SolanaSigner,
    params: UserLockParams,
    program: Program,
): Promise<AtomicResult> {
    if (!params.atomicContract) throw new Error('No contract address')

    const walletPublicKey = new PublicKey(signer.publicKey)

    const { transaction, blockhash, lastValidBlockHeight } = await userLockTransactionBuilder({
        ...params,
        connection,
        program,
        walletPublicKey
    })

    let signature: string
    try {
        signature = await signer.sendTransaction(transaction)
    } catch (e: any) {
        console.error('[SolanaHTLC] sendTransaction failed', e?.message ?? String(e), e?.logs ?? [])
        throw e
    }

    const res = await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
    })

    if (res?.value.err) {
        console.error('[SolanaHTLC] confirmTransaction error', res.value.err.toString())
        throw new Error(res.value.err.toString())
    }

    return { hash: signature, hashlock: params.hashlock, nonce: params.nonce }
}
