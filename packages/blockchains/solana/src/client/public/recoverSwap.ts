import { BorshCoder, EventParser } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import type { Network, UserLockDetails, LockParams } from '@train-protocol/sdk'
import { TrainHtlc } from '../../idl/trainHtlc.js'
import { uint8ArrayToHex } from '../../utils.js'

export async function recoverSwap(
    connection: Connection,
    txHash: string,
    network: Network,
    getUserLockDetailsFn: (params: LockParams) => Promise<UserLockDetails | null>,
): Promise<UserLockDetails> {
    if (!/^[1-9A-HJ-NP-Za-km-z]{43,88}$/.test(txHash))
        throw new Error('Invalid transaction hash format')

    let tx = await connection.getTransaction(txHash, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
    })
    if (!tx || !tx.meta?.logMessages?.length) {
        tx = await connection.getTransaction(txHash, {
            commitment: 'finalized',
            maxSupportedTransactionVersion: 0,
        })
    }
    if (!tx) throw new Error('Transaction not found')

    const logs = tx.meta?.logMessages ?? []

    const invokeRegex = /^Program (\S+) invoke \[\d+\]$/
    const programIds = [...new Set(
        logs.map(l => l.match(invokeRegex)?.[1]).filter((id): id is string => !!id)
    )]

    let userLocked: Record<string, any> | undefined

    for (const pid of programIds) {
        try {
            const parser = new EventParser(new PublicKey(pid), new BorshCoder(TrainHtlc(pid)))
            for (const event of parser.parseLogs(logs)) {
                if (event.name.toLowerCase() === 'userlocked') {
                    userLocked = event.data as Record<string, any>
                    break
                }
            }
            if (userLocked) break
        } catch {
            // Not a TrainHtlc program — skip
        }
    }

    if (!userLocked) {
        throw new Error('This transaction does not contain a swap lock')
    }

    const hashlock = '0x' + uint8ArrayToHex(new Uint8Array(userLocked.hashlock as number[]))
    const eventTokenMint = (userLocked.tokenMint ?? userLocked.token_mint) as PublicKey
    const eventToken = eventTokenMint.toBase58()

    const token = network.tokens.find(t => t.contract?.toLowerCase() === eventToken.toLowerCase())
    const decimals = token?.decimals ?? 9

    const result = await getUserLockDetailsFn({
        id: hashlock,
        contractAddress: network.trainContract,
        decimals,
        txId: txHash,
        chainId: network.chainId,
    })

    if (!result) throw new Error('Lock not found for recovered hashlock')

    return result
}
