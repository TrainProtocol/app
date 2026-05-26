import { Program } from '@coral-xyz/anchor'
import { Connection } from '@solana/web3.js'
import type { UserLockParams, AtomicResult } from '@train-protocol/sdk'
import type { SolanaSigner } from '../../types.js'
import { buildUserLockTx } from './buildUserLockTx.js'
import { PublicKey } from '@solana/web3.js'

export async function userLock(
    connection: Connection,
    signer: SolanaSigner,
    params: UserLockParams,
    program: Program,
): Promise<AtomicResult> {
    const walletPublicKey = new PublicKey(signer.publicKey)
    const tx = await buildUserLockTx(connection, program, walletPublicKey, params)

    let signature: string
    try {
        signature = await signer.sendTransaction(tx)
    } catch (e: any) {
        console.error('[SolanaHTLC] sendTransaction failed', e?.message ?? String(e), e?.logs ?? [])
        throw e
    }

    const res = await connection.confirmTransaction({
        blockhash: tx.recentBlockhash!,
        lastValidBlockHeight: tx.lastValidBlockHeight!,
        signature,
    })

    if (res?.value.err) {
        console.error('[SolanaHTLC] confirmTransaction error', res.value.err.toString())
        throw new Error(res.value.err.toString())
    }

    return { hash: signature, hashlock: params.hashlock, nonce: params.nonce }
}
