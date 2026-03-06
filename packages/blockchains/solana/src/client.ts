import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction, TransactionInstruction, VersionedTransaction } from '@solana/web3.js'
import {
    HTLCClient,
    TrainApiClient,
    UserLockParams,
    LockParams,
    RefundParams,
    RedeemSolverParams,
    LockDetails,
    LockStatus,
    AtomicResult,
    RecoveredSwapData,
    formatUnits,
    bytesToHex,
} from '@train-protocol/sdk'
import type { SolanaHTLCClientConfig, SolanaSigner } from './types.js'
import { TrainHtlc } from './idl/trainHtlc.js'
import { userLockTransactionBuilder } from './transactionBuilder.js'
import { secretToBuffer } from './utils.js'

// Raw Anchor-deserialized on-chain account shapes (u64 → BN, pubkey → PublicKey, [u8;32] → number[])
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
        super(config.apiClient as TrainApiClient)
        this.connection = new Connection(config.rpcUrl, 'confirmed')
        this.signer = config.signer
    }

    // ── Write Operations ────────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        const signer = this.requireSigner()
        const { atomicContract, sourceAsset, hashlock: hashlockHex, timelockDelta, rewardTimelockDelta } = params

        if (!atomicContract) throw new Error('No contract address')

        const walletPublicKey = new PublicKey(signer.publicKey)
        const program = this.buildProgram(atomicContract, walletPublicKey)
        const hashlock = Buffer.from(hashlockHex.replace('0x', ''), 'hex')

        const { transaction, blockhash, lastValidBlockHeight } = await userLockTransactionBuilder({
            connection: this.connection,
            program,
            walletPublicKey,
            hashlock,
            sourceChain: params.sourceChain,
            destinationChain: params.destinationChain,
            destinationAsset: params.destinationAsset,
            destinationAddress: params.destinationAddress,
            destinationAmount: params.destinationAmount,
            lpAddress: params.srcLpAddress,
            sourceAsset: {
                symbol: sourceAsset.symbol,
                contractAddress: sourceAsset.contractAddress,
            },
            amount: params.amount,
            decimals: params.decimals,
            timelockDelta: timelockDelta || 0,
            quoteExpiry: params.quoteExpiry ?? Math.floor(Date.now() / 1000) + 86400,
            rewardAmount: params.rewardAmount ?? '0',
            rewardToken: params.rewardToken ?? '',
            rewardRecipient: params.rewardRecipient ?? '',
            rewardTimelockDelta: rewardTimelockDelta || 0,
            solverData: params.solverData,
            nonce: params.nonce,
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

        return { hash: signature, hashlock: hashlockHex }
    }

    async refund(params: RefundParams): Promise<string> {
        const signer = this.requireSigner()
        const { id, sourceAsset, contractAddress } = params

        if (!contractAddress) throw new Error('No contract address')

        const walletPublicKey = new PublicKey(signer.publicKey)
        const hashlockBuffer = Buffer.from(id.replace('0x', ''), 'hex')
        const hashlockArray = Array.from(hashlockBuffer)
        const program = this.buildProgram(contractAddress, walletPublicKey)

        const [userLockPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("user_lock"), hashlockBuffer],
            program.programId
        )

        try {
            let refundIx: TransactionInstruction
            if (sourceAsset.contractAddress) {
                const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
                const tokenMint = new PublicKey(sourceAsset.contractAddress)
                const senderTokenAccount = await getAssociatedTokenAddress(tokenMint, walletPublicKey)
                const [vault] = PublicKey.findProgramAddressSync(
                    [Buffer.from("vault"), hashlockBuffer],
                    program.programId
                )

                refundIx = await program.methods
                    .refundUserToken(hashlockArray)
                    .accounts({
                        caller: walletPublicKey,
                        userLock: userLockPda,
                        sender: walletPublicKey,
                        tokenMint,
                        vault,
                        senderTokenAccount,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    })
                    .instruction()
            } else {
                refundIx = await program.methods
                    .refundUserSol(hashlockArray)
                    .accounts({
                        caller: walletPublicKey,
                        userLock: userLockPda,
                        sender: walletPublicKey,
                    })
                    .instruction()
            }

            const closeIx = await program.methods
                .closeUserLock(hashlockArray)
                .accounts({ caller: walletPublicKey, userLock: userLockPda })
                .instruction()

            const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash()
            const tx = new Transaction()
            tx.recentBlockhash = blockhash
            tx.lastValidBlockHeight = lastValidBlockHeight
            tx.feePayer = walletPublicKey
            tx.add(refundIx, closeIx)

            const signature = await signer.sendTransaction(tx)

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
        const { sourceAsset, id, secret, contractAddress, destinationAddress } = params

        if (!contractAddress) throw new Error('No contract address')

        const walletPublicKey = new PublicKey(signer.publicKey)
        const hashlockBuffer = Buffer.from(id.replace('0x', ''), 'hex')
        const hashlockArray = Array.from(hashlockBuffer)
        const secretArray = Array.from(secretToBuffer(secret))
        const lockIndex = params.index ?? 1

        const indexBuffer = Buffer.alloc(8)
        indexBuffer.writeBigUInt64LE(BigInt(lockIndex))

        const program = this.buildProgram(contractAddress, walletPublicKey)

        const [solverLockPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("solver_lock"), hashlockBuffer, indexBuffer],
            program.programId
        )

        try {
            const solverLockAccount = await (program.account as TypedProgramAccounts).solverLock.fetch(solverLockPda)
            const rewardRecipient: PublicKey = new PublicKey(solverLockAccount.rewardRecipient)

            const recipient = destinationAddress
                ? new PublicKey(destinationAddress)
                : walletPublicKey

            let tx
            if (sourceAsset.contractAddress) {
                const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
                const tokenMint = new PublicKey(sourceAsset.contractAddress)
                const [vault] = PublicKey.findProgramAddressSync(
                    [Buffer.from("vault"), hashlockBuffer, indexBuffer],
                    program.programId
                )
                const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipient)
                const rewardRecipientTokenAccount = await getAssociatedTokenAddress(tokenMint, rewardRecipient)
                const callerTokenAccount = await getAssociatedTokenAddress(tokenMint, walletPublicKey)

                tx = await program.methods
                    .redeemSolverToken(hashlockArray, lockIndex, secretArray)
                    .accounts({
                        caller: walletPublicKey,
                        solverLock: solverLockPda,
                        recipient,
                        rewardRecipient,
                        tokenMint,
                        vault,
                        recipientTokenAccount,
                        rewardRecipientTokenAccount,
                        callerTokenAccount,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    })
                    .transaction()
            } else {
                tx = await program.methods
                    .redeemSolverSol(hashlockArray, lockIndex, secretArray)
                    .accounts({
                        caller: walletPublicKey,
                        solverLock: solverLockPda,
                        recipient,
                        rewardRecipient,
                    })
                    .transaction()
            }

            const blockHash = await this.connection.getLatestBlockhash()
            tx.recentBlockhash = blockHash.blockhash
            tx.lastValidBlockHeight = blockHash.lastValidBlockHeight
            tx.feePayer = walletPublicKey

            return signer.sendTransaction(tx)
        } catch (error) {
            console.error('Error in redeemSolver:', error)
            throw error
        }
    }

    // ── Read Operations ─────────────────────────────────────────────────

    async getUserLockDetails(params: LockParams): Promise<LockDetails | null> {
        const { contractAddress, id } = params

        if (!contractAddress) throw new Error('No contract address')

        const hashlockBuffer = Buffer.from(id.replace('0x', ''), 'hex')
        const program = this.buildProgram(contractAddress)

        const [userLockPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("user_lock"), hashlockBuffer],
            program.programId
        )

        // Fetch log data from tx independently — needed even if account isn't indexed yet
        const logsPromise = params.txId
            ? this.findUserDataFromLogs(params.txId, id, program)
            : Promise.resolve({} as { userData?: string; blockTimestamp?: number })

        const accountInfo = await this.connection.getAccountInfo(userLockPda)
        if (!accountInfo) {
            const sigs = await this.connection.getSignaturesForAddress(userLockPda, { limit: 1 }).catch(() => [])
            if (!sigs.length) return null
            const closedTx = await this.connection.getTransaction(sigs[0].signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
            const PROGRAM_DATA_PREFIX = 'Program data: '
            const PROGRAM_LOG_PREFIX = 'Program log: '
            for (const log of closedTx?.meta?.logMessages ?? []) {
                const isData = log.startsWith(PROGRAM_DATA_PREFIX)
                if (!isData && !log.startsWith(PROGRAM_LOG_PREFIX)) continue
                const event = program.coder.events.decode(isData ? log.slice(PROGRAM_DATA_PREFIX.length) : log.slice(PROGRAM_LOG_PREFIX.length))
                if (!event) continue
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

            const { userData, blockTimestamp } = await logsPromise

            const details: LockDetails = {
                hashlock: `0x${id.replace('0x', '')}`,
                amount: Number(formatUnits(BigInt(result.amount.toString()), params.decimals ?? 6)),
                timelock: Number(result.timelock),
                sender: new PublicKey(result.sender).toString(),
                recipient: new PublicKey(result.recipient).toString(),
                secret: this.parseSecret(result.secret),
                token: result.tokenMint && result.tokenMint.toString() !== '11111111111111111111111111111111'
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

    async _getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<LockDetails | null> {
        const { contractAddress, id } = params

        if (!contractAddress) throw new Error('No contract address')

        const connection = new Connection(nodeUrl, 'confirmed')
        const hashlockBuffer = Buffer.from(id.replace('0x', ''), 'hex')

        const pk = this.signer ? new PublicKey(this.signer.publicKey) : new PublicKey('11111111111111111111111111111111')
        const wallet = {
            publicKey: pk,
            signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => tx,
            signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => txs,
        }
        const provider = new AnchorProvider(connection, wallet as Wallet, AnchorProvider.defaultOptions())
        const program = new Program(TrainHtlc(contractAddress), provider)

        // Count-then-loop: iterate PDAs from index 1 until getAccountInfo returns null
        for (let i = 1; ; i++) {
            const indexBuffer = Buffer.alloc(8)
            indexBuffer.writeBigUInt64LE(BigInt(i))

            const [solverLockPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("solver_lock"), hashlockBuffer, indexBuffer],
                program.programId
            )

            const accountInfo = await connection.getAccountInfo(solverLockPda)
            if (!accountInfo) return null

            try {
                const result = await (program.account as TypedProgramAccounts).solverLock.fetch(solverLockPda)

                if (!result) continue

                // Skip empty slots
                const sender = new PublicKey(result.sender).toString()
                if (sender === '11111111111111111111111111111111') continue

                // Filter by solver address if provided
                if (params.solverAddress && sender.toLowerCase() !== params.solverAddress.toLowerCase()) continue

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
                    token: result.tokenMint && result.tokenMint.toString() !== '11111111111111111111111111111111'
                        ? result.tokenMint.toString()
                        : undefined,
                    rewardToken: result.rewardTokenMint && result.rewardTokenMint.toString() !== '11111111111111111111111111111111'
                        ? result.rewardTokenMint.toString()
                        : undefined,
                    status: Number(result.status) as LockStatus,
                    index: i,
                }
            } catch (e) {
                console.error('Error fetching Solana solver lock details:', e)
                return null
            }
        }
    }

    async recoverSwap(_txHash: string): Promise<RecoveredSwapData> {
        throw new Error('recoverSwap is not supported for Solana')
    }

    // ── Private Helpers ─────────────────────────────────────────────────

    private requireSigner(): SolanaSigner {
        if (!this.signer) throw new Error('Solana signer not configured')
        return this.signer
    }

    private parseSecret(secretBytes: Uint8Array | number[]): bigint | undefined {
        return Array.from(secretBytes).some(b => b !== 0)
            ? BigInt(bytesToHex(Array.from(secretBytes)))
            : undefined
    }

    private buildReadOnlyProvider(publicKey: PublicKey): AnchorProvider {
        const wallet = {
            publicKey,
            signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => tx,
            signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => txs,
        }
        return new AnchorProvider(this.connection, wallet as Wallet, AnchorProvider.defaultOptions())
    }

    private buildProgram(contractAddress: string, readerKey?: PublicKey): Program {
        const pk = readerKey
            ?? (this.signer ? new PublicKey(this.signer.publicKey) : new PublicKey('11111111111111111111111111111111'))
        const provider = this.buildReadOnlyProvider(pk)
        return new Program(TrainHtlc(contractAddress), provider)
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

            const PROGRAM_DATA_PREFIX = 'Program data: '
            const PROGRAM_LOG_PREFIX = 'Program log: '
            for (const log of logs) {
                const isData = log.startsWith(PROGRAM_DATA_PREFIX)
                const isLog = log.startsWith(PROGRAM_LOG_PREFIX)
                if (!isData && !isLog) continue

                const b64 = isData ? log.slice(PROGRAM_DATA_PREFIX.length) : log.slice(PROGRAM_LOG_PREFIX.length)
                const event = program.coder.events.decode(b64)
                if (!event || event.name.toLowerCase() !== 'userlocked') continue

                const hashlockBytes: number[] = Array.from(event.data.hashlock as number[])
                const eventHashlock = '0x' + Buffer.from(hashlockBytes).toString('hex')
                if (eventHashlock.toLowerCase() !== `0x${id.replace('0x', '')}`.toLowerCase()) continue

                const userDataBytes: number[] = Array.from((event.data as Record<string, unknown>).userData as Buffer ?? [])
                const userData = userDataBytes.length > 0
                    ? Buffer.from(userDataBytes).toString('utf8').replace(/\0/g, '').trim() || undefined
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
