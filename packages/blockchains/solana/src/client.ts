import { AnchorProvider, BN, BorshCoder, EventParser, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import {
    HTLCClient,
    UserLockParams,
    LockParams,
    RefundParams,
    RedeemSolverParams,
    UserLockDetails,
    SolverLockDetails,
    LockStatus,
    AtomicResult,
    RecoveredSwapData,
    formatUnits,
    bytesToHex,
} from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from './constants.js'
import type { SolanaHTLCClientConfig, SolanaSigner } from './types.js'
import { TrainHtlc } from './idl/trainHtlc.js'
import { userLockTransactionBuilder, refundTransactionBuilder, redeemSolverTransactionBuilder } from './transactionBuilder.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function hexToUint8Array(hex: string): Uint8Array {
    const clean = hex.replace('0x', '')
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
    }
    return bytes
}

function uint8ArrayToHex(bytes: Uint8Array | number[]): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function writeBigUInt64LE(value: bigint): Uint8Array {
    const buf = new Uint8Array(8)
    const view = new DataView(buf.buffer)
    view.setBigUint64(0, value, true)
    return buf
}

interface UserLockData {
    amount: BN
    timelock: BN
    sender: PublicKey
    recipient: PublicKey
    secret: number[]
    tokenMint: PublicKey
    status: number
}

interface SolverLockData {
    amount: BN
    reward: BN
    timelock: BN
    rewardTimelock: BN
    sender: PublicKey
    recipient: PublicKey
    rewardRecipient: PublicKey
    secret: number[]
    tokenMint: PublicKey
    rewardTokenMint: PublicKey
    status: number
}

type TypedProgramAccounts = {
    userLock: { fetch(pda: PublicKey): Promise<UserLockData> }
    solverLock: { fetch(pda: PublicKey): Promise<SolverLockData> }
}

export class SolanaHTLCClient extends HTLCClient {
    private connection: Connection
    private signer: SolanaSigner | undefined

    constructor(config: SolanaHTLCClientConfig) {
        super()
        this.connection = new Connection(config.rpcUrl, 'confirmed')
        this.signer = config.signer
    }

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        const signer = this.requireSigner()

        if (!params.atomicContract) throw new Error('No contract address')

        const walletPublicKey = new PublicKey(signer.publicKey)
        const program = this.buildProgram(params.atomicContract, walletPublicKey)

        const { transaction, blockhash, lastValidBlockHeight } = await userLockTransactionBuilder({
            ...params,
            connection: this.connection,
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

        const res = await this.connection.confirmTransaction({
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

    async refund(params: RefundParams): Promise<string> {
        const signer = this.requireSigner()

        if (!params.contractAddress) throw new Error('No contract address')

        const walletPublicKey = new PublicKey(signer.publicKey)
        const program = this.buildProgram(params.contractAddress, walletPublicKey)

        try {
            const { transaction, blockhash, lastValidBlockHeight } = await refundTransactionBuilder({
                ...params,
                connection: this.connection,
                program,
                walletPublicKey,
            })

            const signature = await signer.sendTransaction(transaction)

            const res = await this.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature })
            if (res?.value.err) {
                throw new Error(res.value.err.toString())
            }

            return signature
        } catch (error: any) {
            console.error('[SolanaHTLC] refund failed', error?.message ?? error, error?.logs ?? [])
            throw error
        }
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        const signer = this.requireSigner()

        if (!params.contractAddress) throw new Error('No contract address')

        const walletPublicKey = new PublicKey(signer.publicKey)
        const program = this.buildProgram(params.contractAddress, walletPublicKey)

        try {
            const { transaction, blockhash, lastValidBlockHeight } = await redeemSolverTransactionBuilder({
                ...params,
                connection: this.connection,
                program,
                walletPublicKey,
            })

            const signature = await signer.sendTransaction(transaction)

            const res = await this.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature })
            if (res?.value.err) {
                throw new Error(res.value.err.toString())
            }

            return signature
        } catch (error) {
            console.error('Error in redeemSolver:', error)
            throw error
        }
    }

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        const { contractAddress, id } = params

        if (!contractAddress) throw new Error('No contract address')

        let program: ReturnType<typeof this.buildProgram>
        try {
            program = this.buildProgram(contractAddress)
        } catch {
            return null
        }

        const hashlockBytes = hexToUint8Array(id.replace('0x', ''))

        const [userLockPda] = PublicKey.findProgramAddressSync(
            [encoder.encode("user_lock"), hashlockBytes],
            program.programId
        )

        const accountInfo = await this.connection.getAccountInfo(userLockPda)
        if (!accountInfo) {
            const sigs = await this.connection.getSignaturesForAddress(userLockPda, { limit: 1 }).catch(() => [])
            if (!sigs.length) return null
            const closedTx = await this.connection.getTransaction(sigs[0].signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
            for (const event of this.parseLogEvents(closedTx?.meta?.logMessages ?? [], program)) {
                const name = event.name.toLowerCase()
                if (name === 'userrefunded' || name === 'userredeemed') {
                    return {
                        hashlock: `0x${id.replace('0x', '')}`,
                        amount: 0, timelock: 0, secret: undefined,
                        status: name === 'userrefunded' ? LockStatus.Refunded : LockStatus.Redeemed,
                        blockTimestamp: closedTx?.blockTime ? closedTx.blockTime * 1000 : undefined,
                    }
                }
            }
            return null
        }

        try {
            const result = await (program.account as TypedProgramAccounts).userLock.fetch(userLockPda)

            if (!result) return null

            const { userData, blockTimestamp } = params.txId ? await this.findUserDataFromLogs(params.txId, id, program) : {}

            const details: UserLockDetails = {
                hashlock: `0x${id.replace('0x', '')}`,
                amount: Number(formatUnits(BigInt(result.amount.toString()), params.decimals ?? 6)),
                timelock: Number(result.timelock),
                sender: new PublicKey(result.sender).toString(),
                recipient: new PublicKey(result.recipient).toString(),
                secret: this.parseSecret(result.secret),
                token: result.tokenMint && result.tokenMint.toString() !== NATIVE_SOL_ADDRESS
                    ? result.tokenMint.toString()
                    : undefined,
                status: Number(result.status) as LockStatus,
                userData,
                blockTimestamp,
            }
            return details
        } catch (e) {
            console.error('[SolanaHTLC][getUserLockDetails] fetch failed', e)
            return null
        }
    }

    async getSolverLockCount(params: LockParams, nodeUrl: string): Promise<number> {
        const { contractAddress, id } = params

        if (!contractAddress) throw new Error('No contract address')

        const connection = new Connection(nodeUrl, 'confirmed')
        const hashlockBytes = hexToUint8Array(id.replace('0x', ''))
        const program = this.buildProgram(contractAddress, undefined, connection)

        const hashlockArray = Array.from(hashlockBytes)
        return Number(await program.methods.getSolverLockCount(hashlockArray).view())
    }

    async getSolverLockByIndex(params: LockParams, index: number, nodeUrl: string): Promise<SolverLockDetails | null> {
        const { contractAddress, id } = params

        if (!contractAddress) throw new Error('No contract address')

        const connection = new Connection(nodeUrl, 'confirmed')
        const hashlockBytes = hexToUint8Array(id.replace('0x', ''))
        const program = this.buildProgram(contractAddress, undefined, connection)

        const indexBytes = writeBigUInt64LE(BigInt(index))

        const [solverLockPda] = PublicKey.findProgramAddressSync(
            [encoder.encode("solver_lock"), hashlockBytes, indexBytes],
            program.programId
        )

        try {
            const result = await (program.account as TypedProgramAccounts).solverLock.fetch(solverLockPda)

            if (!result) return null

            // Skip empty slots
            const sender = new PublicKey(result.sender).toString()
            if (sender === NATIVE_SOL_ADDRESS) return null

            return {
                hashlock: `0x${id.replace('0x', '')}`,
                amount: Number(formatUnits(BigInt(result.amount.toString()), params.decimals ?? 6)),
                reward: Number(formatUnits(BigInt(result.reward.toString()), params.decimals ?? 6)),
                timelock: Number(result.timelock),
                rewardTimelock: Number(result.rewardTimelock),
                sender,
                recipient: new PublicKey(result.recipient).toString(),
                rewardRecipient: new PublicKey(result.rewardRecipient).toString(),
                secret: this.parseSecret(result.secret),
                token: result.tokenMint && result.tokenMint.toString() !== NATIVE_SOL_ADDRESS
                    ? result.tokenMint.toString()
                    : undefined,
                rewardToken: result.rewardTokenMint && result.rewardTokenMint.toString() !== NATIVE_SOL_ADDRESS
                    ? result.rewardTokenMint.toString()
                    : undefined,
                status: Number(result.status) as LockStatus,
                index,
            }
        } catch (e) {
            console.error('Error fetching Solana solver lock details:', e)
            return null
        }
    }

    async recoverSwap(txHash: string): Promise<RecoveredSwapData> {
        if (!/^[1-9A-HJ-NP-Za-km-z]{43,88}$/.test(txHash))
            throw new Error('Invalid transaction hash format')

        let tx = await this.connection.getTransaction(txHash, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        })
        if (!tx || !tx.meta?.logMessages?.length) {
            tx = await this.connection.getTransaction(txHash, {
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

        let userLocked: { name: string; data: Record<string, unknown> } | undefined
        let srcContract: string | undefined

        for (const pid of programIds) {
            try {
                const parser = new EventParser(new PublicKey(pid), new BorshCoder(TrainHtlc(pid)))
                for (const event of parser.parseLogs(logs)) {
                    if (event.name.toLowerCase() === 'userlocked') {
                        userLocked = { name: event.name, data: event.data as Record<string, unknown> }
                        srcContract = pid
                        break
                    }
                }
                if (userLocked) break
            } catch {
                // Not a TrainHtlc program — skip
            }
        }

        if (!userLocked || !srcContract) {
            throw new Error('This transaction does not contain a swap lock')
        }

        const data = userLocked.data as Record<string, any>
        const hashlock = '0x' + uint8ArrayToHex(new Uint8Array(data.hashlock as number[]))

        return {
            hashlock,
            sender: (data.sender as PublicKey).toBase58(),
            recipient: (data.recipient as PublicKey).toBase58(),
            srcChain: data.src_chain as string,
            dstChain: data.dst_chain as string,
            token: (data.token_mint as PublicKey).toBase58(),
            amount: BigInt((data.amount as BN).toString()),
            dstAddress: data.dst_address as string,
            dstAmount: BigInt((data.dst_amount as BN).toString()),
            dstToken: data.dst_token as string,
            srcContract,
        }
    }

    // ── Private Helpers ─────────────────────────────────────────────────

    private requireSigner(): SolanaSigner {
        if (!this.signer) throw new Error('Solana signer not configured')
        return this.signer
    }

    private parseSecret(secretBytes: Uint8Array | number[]): bigint | undefined {
        return Array.from(secretBytes).some(b => b !== 0) ? BigInt(bytesToHex(Array.from(secretBytes))) : undefined
    }

    private buildReadOnlyProvider(publicKey: PublicKey, connection?: Connection): AnchorProvider {
        const wallet = {
            publicKey,
            signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => tx,
            signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => txs,
        }
        return new AnchorProvider(connection ?? this.connection, wallet as Wallet, AnchorProvider.defaultOptions())
    }

    private buildProgram(contractAddress: string, readerKey?: PublicKey, connection?: Connection): Program {
        const pk = readerKey ?? (this.signer ? new PublicKey(this.signer.publicKey) : new PublicKey(NATIVE_SOL_ADDRESS))
        const provider = this.buildReadOnlyProvider(pk, connection)
        return new Program(TrainHtlc(contractAddress), provider)
    }

    private parseLogEvents(logs: string[], program: Program): Array<{ name: string; data: Record<string, unknown> }> {
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

    private async findUserDataFromLogs(
        txId: string,
        id: string,
        program: Program
    ): Promise<{ userData?: string; blockTimestamp?: number }> {
        try {
            let tx = await this.connection.getTransaction(txId, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            })
            // Some RPCs omit logMessages at 'confirmed' — retry at 'finalized'
            if (!tx || !tx.meta?.logMessages?.length) {
                tx = await this.connection.getTransaction(txId, {
                    commitment: 'finalized',
                    maxSupportedTransactionVersion: 0,
                })
            }
            if (!tx) return {}

            const blockTimestamp = tx.blockTime ? tx.blockTime * 1000 : undefined
            const logs = tx.meta?.logMessages ?? []

            for (const event of this.parseLogEvents(logs, program)) {
                if (event.name.toLowerCase() !== 'userlocked') continue

                const hashlockBytes: number[] = Array.from(event.data.hashlock as number[])
                const eventHashlock = '0x' + uint8ArrayToHex(new Uint8Array(hashlockBytes))
                if (eventHashlock.toLowerCase() !== `0x${id.replace('0x', '')}`.toLowerCase()) continue

                const userDataBytes: number[] = Array.from((event.data as Record<string, unknown>).user_data as Uint8Array ?? [])
                const userData = userDataBytes.length > 0
                    ? decoder.decode(new Uint8Array(userDataBytes)).replace(/\0/g, '').trim() || undefined
                    : undefined

                return { userData, blockTimestamp }
            }

            return { blockTimestamp }
        } catch (e) {
            console.error('Error fetching userData from Solana logs:', e)
            return {}
        }
    }


}
