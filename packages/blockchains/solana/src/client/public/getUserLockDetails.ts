import { BorshCoder, EventParser, Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { LockStatus, formatUnits, normalizePayoutCurveData } from '@train-protocol/sdk'
import type { LockParams, UserLockDetails, EventDerivedData, BaseLockDetails } from '@train-protocol/sdk'
import type { TypedProgramAccounts } from '../../types.js'
import { NATIVE_SOL_ADDRESS } from '../../constants.js'
import { TrainHtlc } from '../../idl/trainHtlc.js'
import { encoder, hexToUint8Array, uint8ArrayToHex, decoder } from '../../utils.js'
import { parseSecret } from '../helpers.js'

export async function getUserLockDetails(
    connection: Connection,
    params: LockParams,
    programFactory: (contractAddress: string, connection?: Connection) => Program,
): Promise<UserLockDetails | null> {
    const { contractAddress, id } = params

    if (!contractAddress) throw new Error('No contract address')

    let program: Program
    try {
        program = programFactory(contractAddress)
    } catch {
        return null
    }

    const hashlockBytes = hexToUint8Array(id.replace('0x', ''))

    const [userLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("user_lock"), hashlockBytes],
        program.programId
    )

    const accountInfo = await connection.getAccountInfo(userLockPda)
    if (!accountInfo) {
        return recoverClosedUserLock(connection, params, id, userLockPda, program)
    }
    try {
        const result = await (program.account as TypedProgramAccounts).userLock.fetch(userLockPda)

        if (!result) return null

        const parsedResult = resolveUserLock(result, id, params.decimals)
        if (!parsedResult) return null

        const { eventData, blockTimestamp } = params.txId
            ? await findUserDataFromLogs(connection, params.txId, id, program)
            : { eventData: {}, blockTimestamp: undefined }

        return { ...parsedResult, ...eventData, blockTimestamp } as UserLockDetails
    } catch (e) {
        console.error('[SolanaHTLC][getUserLockDetails] fetch failed', e)
        return null
    }
}

// ── Private Helpers ─────────────────────────────────────────────────

async function recoverClosedUserLock(connection: Connection, params: LockParams, id: string, pda: PublicKey, program: Program): Promise<UserLockDetails | null> {
    const sigs = await connection.getSignaturesForAddress(pda, { limit: 1 }).catch(() => [])
    if (!sigs.length) return null
    const closedTx = await connection.getTransaction(sigs[0].signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
    for (const event of parseLogEvents(closedTx?.meta?.logMessages ?? [], program)) {
        const name = event.name.toLowerCase()
        if (name === 'userrefunded' || name === 'userredeemed') {
            const { eventData, lockTerms } = params.txId
                ? await findUserDataFromLogs(connection, params.txId, id, program)
                : { eventData: {}, lockTerms: undefined }

            const amountInBaseUnits = lockTerms?.amountInBaseUnits

            return {
                hashlock: `0x${id.replace('0x', '')}`,
                amount: amountInBaseUnits ? Number(formatUnits(amountInBaseUnits, params.decimals)) : 0,
                timelock: 0, secret: 0n,
                sender: '', recipient: '', token: '',
                ...lockTerms,
                ...eventData,
                status: name === 'userrefunded' ? LockStatus.Refunded : LockStatus.Redeemed,
                blockTimestamp: closedTx?.blockTime ? closedTx.blockTime * 1000 : undefined,
            } as UserLockDetails
        }
    }
    return null
}

function parseLogEvents(logs: string[], program: Program): Array<{ name: string; data: Record<string, unknown> }> {
    const PROGRAM_DATA_PREFIX = 'Program data: '
    const PROGRAM_LOG_PREFIX = 'Program log: '
    const events: Array<{ name: string; data: Record<string, unknown> }> = []
    for (const log of logs) {
        const isData = log.startsWith(PROGRAM_DATA_PREFIX)
        if (!isData && !log.startsWith(PROGRAM_LOG_PREFIX)) continue
        const event = program.coder.events.decode(isData ? log.slice(PROGRAM_DATA_PREFIX.length) : log.slice(PROGRAM_LOG_PREFIX.length))
        if (event) events.push(event as { name: string; data: Record<string, unknown> })
    }
    return events
}

async function findUserDataFromLogs(
    connection: Connection,
    txId: string,
    id: string,
    program: Program
): Promise<{ eventData: Partial<EventDerivedData>; lockTerms?: Partial<BaseLockDetails>; blockTimestamp?: number }> {
    const eventData: Partial<EventDerivedData> = {}
    let lockTerms: Partial<BaseLockDetails> | undefined
    try {
        let tx = await connection.getTransaction(txId, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        })
        // Some RPCs omit logMessages at 'confirmed' — retry at 'finalized'
        if (!tx || !tx.meta?.logMessages?.length) {
            tx = await connection.getTransaction(txId, {
                commitment: 'finalized',
                maxSupportedTransactionVersion: 0,
            })
        }
        if (!tx) return { eventData }

        const blockTimestamp = tx.blockTime ? tx.blockTime * 1000 : undefined
        const logs = tx.meta?.logMessages ?? []

        const parser = new EventParser(program.programId, new BorshCoder(TrainHtlc(program.programId.toBase58())))
        for (const event of parser.parseLogs(logs)) {
            if (event.name.toLowerCase() !== 'userlocked') continue

            const data = event.data as Record<string, any>
            const hashlockBytes: number[] = Array.from(data.hashlock as number[])
            const eventHashlock = '0x' + uint8ArrayToHex(new Uint8Array(hashlockBytes))
            if (eventHashlock.toLowerCase() !== `0x${id.replace('0x', '')}`.toLowerCase()) continue

            const decodeBytes = (raw: unknown): string | undefined => {
                const bytes: number[] = Array.from((raw as number[]) ?? [])
                return bytes.length > 0
                    ? decoder.decode(new Uint8Array(bytes)).replace(/\0/g, '').trim() || undefined
                    : undefined
            }

            eventData.userData = decodeBytes(data.userData ?? data.user_data)
            eventData.solverData = decodeBytes(data.solverData ?? data.solver_data)

            const dstChain = data.dst_chain ?? data.dstChain
            if (dstChain != null) eventData.dstChain = typeof dstChain === 'string' ? dstChain : decodeBytes(dstChain)

            const dstAddress = data.dst_address ?? data.dstAddress
            if (dstAddress != null) eventData.dstAddress = typeof dstAddress === 'string' ? dstAddress : decodeBytes(dstAddress)

            const dstToken = data.dst_token ?? data.dstToken
            if (dstToken != null) eventData.dstToken = typeof dstToken === 'string' ? dstToken : decodeBytes(dstToken)

            const dstAmountRaw = data.dstAmount ?? data.dst_amount
            if (dstAmountRaw != null) eventData.dstAmount = BigInt(dstAmountRaw.toString())

            // The reward recipient is the solver's address on the *destination* chain — it is a
            // cross-chain identifier (byte string, not Pubkey) for that reason. It is the only
            // place a swap recovered from a source tx can learn which solver to read the
            // destination lock from, since the quote that carried it is gone.
            const rewardRecipient = data.rewardRecipient ?? data.reward_recipient
            if (rewardRecipient != null) {
                eventData.rewardRecipient = typeof rewardRecipient === 'string'
                    ? rewardRecipient
                    : decodeBytes(rewardRecipient)
            }

            const payoutCurve = new PublicKey(data.payout_curve ?? data.payoutCurve).toBase58()
            const refundTo = data.refund_to ?? data.refundTo

            lockTerms = {
                amountInBaseUnits: BigInt(data.amount.toString()),
                timelock: Number(data.timelock),
                sender: new PublicKey(data.sender).toBase58(),
                recipient: new PublicKey(data.recipient).toBase58(),
                token: new PublicKey(data.token_mint ?? data.tokenMint).toBase58(),
                refundTo: refundTo ? new PublicKey(refundTo).toBase58() : undefined,
                payoutCurve: payoutCurve === NATIVE_SOL_ADDRESS ? null : payoutCurve,
            }

            return { eventData, lockTerms, blockTimestamp }
        }

        return { eventData, blockTimestamp }
    } catch (e) {
        console.error('Error fetching event data from Solana logs:', e)
        return { eventData }
    }
}

export function resolveUserLock(result: any, id: string, decimals: number): BaseLockDetails | null {
    const sender = new PublicKey(result.sender).toString()
    if (sender === NATIVE_SOL_ADDRESS) return null
    if (result.payoutCurve == null || result.payoutCurveData == null) {
        throw new Error('User lock payout policy is unavailable')
    }

    const payoutCurve = new PublicKey(result.payoutCurve).toString()

    return {
        hashlock: `0x${id.replace('0x', '')}`,
        amount: Number(formatUnits(BigInt(result.amount.toString()), decimals)),
        amountInBaseUnits: BigInt(result.amount.toString()),
        secret: parseSecret(result.secret),
        timelock: Number(result.timelock),
        status: Number(result.status) as LockStatus,
        sender,
        recipient: new PublicKey(result.recipient).toString(),
        token: result.tokenMint ? result.tokenMint.toString() : '',
        refundTo: result.refundTo ? new PublicKey(result.refundTo).toString() : undefined,
        payoutCurve: payoutCurve === NATIVE_SOL_ADDRESS ? null : payoutCurve,
        payoutCurveData: normalizePayoutCurveData(result.payoutCurveData),
    }
}
