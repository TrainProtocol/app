import { AnchorProvider, BN, BorshCoder, EventParser, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import {
    HTLCClient,
    UserLockParams,
    LockParams,
    RefundParams,
    RedeemSolverParams,
    LockStatus,
    AtomicResult,
    Network,
    TransactionInfo,
    TransactionStatus,
    formatUnits,
    bytesToHex,
} from '@train-protocol/sdk'
import type { UserLockDetails, SolverLockDetails, BaseLockDetails, EventDerivedData } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from './constants.js'
import type { SolanaHTLCClientConfig, SolanaSigner, TypedProgramAccounts } from './types.js'
import { TrainHtlc } from './idl/trainHtlc.js'
import { userLockTransactionBuilder, refundTransactionBuilder, redeemSolverTransactionBuilder } from './transactionBuilder.js'
import { decoder, encoder, hexToUint8Array, uint8ArrayToHex, writeBigUInt64LE } from './utils.js'

export class SolanaHTLCClient extends HTLCClient {
    private connection: Connection
    private signer: SolanaSigner | undefined

    constructor(config: SolanaHTLCClientConfig) {
        super()
        this.connection = new Connection(config.rpcUrl, 'confirmed')
        this.signer = config.signer
    }

    // ── Write Operations ───────────────────────────────────────────────

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
            return this.recoverClosedUserLock(id, userLockPda, program)
        }
        try {
            const result = await (program.account as TypedProgramAccounts).userLock.fetch(userLockPda)

            if (!result) return null

            const parsedResult: BaseLockDetails = {
                hashlock: `0x${id.replace('0x', '')}`,
                amount: Number(formatUnits(BigInt(result.amount.toString()), params.decimals)),
                secret: this.parseSecret(result.secret),
                timelock: Number(result.timelock),
                status: Number(result.status) as LockStatus,
                sender: new PublicKey(result.sender).toString(),
                recipient: new PublicKey(result.recipient).toString(),
                token: result.tokenMint ? result.tokenMint.toString() : '',
            }

            const { eventData, blockTimestamp } = params.txId
                ? await this.findUserDataFromLogs(params.txId, id, program)
                : { eventData: {}, blockTimestamp: undefined }

            return { ...parsedResult, ...eventData, blockTimestamp } as UserLockDetails
        } catch (e) {
            console.error('[SolanaHTLC][getUserLockDetails] fetch failed', e)
            return null
        }
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        const { contractAddress, id } = params

        if (!contractAddress) throw new Error('No contract address')

        const connection = new Connection(nodeUrl, 'confirmed')
        const hashlockBytes = hexToUint8Array(id.replace('0x', ''))
        const program = this.buildProgram(contractAddress, undefined, connection)

        const [counterPda] = PublicKey.findProgramAddressSync(
            [encoder.encode("solver_count"), hashlockBytes],
            program.programId
        )
        const counterAccount = await connection.getAccountInfo(counterPda)
        if (!counterAccount) return null
        const count = Number((await (program.account as TypedProgramAccounts).solverLockCounter.fetch(counterPda)).count)
        if (count === 0) return null

        for (let i = 1; i <= count; i++) {
            const result = await this.getSolverLockByIndex(params, i, nodeUrl)
            if (!result) continue
            if (params.solverAddress && result.sender?.toLowerCase() !== params.solverAddress.toLowerCase()) continue
          
            return result
        }

        return null
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
                amount: Number(formatUnits(BigInt(result.amount.toString()), params.decimals)),
                secret: this.parseSecret(result.secret),
                timelock: Number(result.timelock),
                status: Number(result.status) as LockStatus,
                sender,
                recipient: new PublicKey(result.recipient).toString(),
                token: result.tokenMint ? result.tokenMint.toString() : '',
                reward: Number(formatUnits(BigInt(result.reward.toString()), params.decimals)),
                rewardTimelock: Number(result.rewardTimelock),
                rewardRecipient: new PublicKey(result.rewardRecipient).toString(),
                rewardToken: result.rewardTokenMint ? result.rewardTokenMint.toString() : '',
                index,
            }
        } catch (e) {
            console.error('Error fetching Solana solver lock details:', e)
            return null
        }
    }

    async recoverSwap(txHash: string, network: Network): Promise<UserLockDetails> {
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
        const eventToken = (userLocked.token_mint as PublicKey).toBase58()

        const token = network.tokens.find(t => t.contract?.toLowerCase() === eventToken.toLowerCase())
        const decimals = token?.decimals ?? 9

        const result = await this.getUserLockDetails({
            id: hashlock,
            contractAddress: network.trainContract,
            decimals,
            txId: txHash,
            chainId: network.chainId,
        })

        if (!result) throw new Error('Lock not found for recovered hashlock')

        return result
    }

    // ── Public Helpers ─────────────────────────────────────────────────

    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        const tx = await this.connection.getTransaction(txHash, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        })

        if (!tx) {
            const statuses = await this.connection.getSignatureStatuses([txHash])
            const status = statuses?.value?.[0]
            if (!status) return null

            if (status.err) {
                return {
                    hash: txHash,
                    status: TransactionStatus.Failed,
                    blockNumber: status.slot?.toString(),
                }
            }

            return {
                hash: txHash,
                status: status.confirmationStatus === 'finalized' || status.confirmationStatus === 'confirmed'
                    ? TransactionStatus.Confirmed
                    : TransactionStatus.Pending,
                blockNumber: status.slot?.toString(),
            }
        }

        return {
            hash: txHash,
            status: tx.meta?.err ? TransactionStatus.Failed : TransactionStatus.Confirmed,
            blockNumber: tx.slot?.toString(),
            blockTimestamp: tx.blockTime ? tx.blockTime * 1000 : undefined,
        }
    }

    // ── Private Helpers ─────────────────────────────────────────────────

    private requireSigner(): SolanaSigner {
        if (!this.signer) throw new Error('Solana signer not configured')
        return this.signer
    }

    private parseSecret(secretBytes: Uint8Array | number[]): bigint {
        return BigInt(bytesToHex(Array.from(secretBytes)))
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

    private async recoverClosedUserLock(id: string, pda: PublicKey, program: Program): Promise<UserLockDetails | null> {
        const sigs = await this.connection.getSignaturesForAddress(pda, { limit: 1 }).catch(() => [])
        if (!sigs.length) return null
        const closedTx = await this.connection.getTransaction(sigs[0].signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
        for (const event of this.parseLogEvents(closedTx?.meta?.logMessages ?? [], program)) {
            const name = event.name.toLowerCase()
            if (name === 'userrefunded' || name === 'userredeemed') {
                return {
                    hashlock: `0x${id.replace('0x', '')}`,
                    amount: 0, timelock: 0, secret: 0n,
                    sender: '', recipient: '', token: '',
                    status: name === 'userrefunded' ? LockStatus.Refunded : LockStatus.Redeemed,
                    blockTimestamp: closedTx?.blockTime ? closedTx.blockTime * 1000 : undefined,
                } as UserLockDetails
            }
        }
        return null
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
    ): Promise<{ eventData: Partial<EventDerivedData>; blockTimestamp?: number }> {
        const eventData: Partial<EventDerivedData> = {}
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

                return { eventData, blockTimestamp }
            }

            return { eventData, blockTimestamp }
        } catch (e) {
            console.error('Error fetching event data from Solana logs:', e)
            return { eventData }
        }
    }


}
