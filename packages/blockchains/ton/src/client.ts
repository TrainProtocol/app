import { Cell, toNano, Address, TupleBuilder } from '@ton/ton'
import {
    UserLockParams,
    LockParams,
    RefundParams,
    RedeemSolverParams,
    UserLockDetails,
    SolverLockDetails,
    LockStatus,
    AtomicResult,
    RecoveredSwapData,
    TransactionInfo,
    TransactionStatus,
    HTLCClient,
    parseUnits,
    formatUnits,
} from '@train-protocol/sdk'
import type { TonHTLCClientConfig, TonSigner } from './types.js'
import { TonRpcClient } from './rpc.js'
import {
    buildRefundPayload,
    buildRedeemPayload,
    buildJettonUserLockPayload,
    buildUserLockPayload,
    buildTonConnectTx,
} from './transactionBuilder.js'
import {
    GAS_AMOUNT,
    USER_LOCKED_JETTON_OPCODE,
    USER_LOCKED_NATIVE_OPCODE,
    TOKEN_LOCKED_JETTON_OPCODE,
    TOKEN_LOCKED_NATIVE_OPCODE,
} from './constants.js'

export class TonHTLCClient extends HTLCClient {
    private rpc: TonRpcClient
    private rpcUrl: string
    private apiKey: string | undefined
    private signer: TonSigner | undefined

    constructor(config: TonHTLCClientConfig) {
        super()
        this.rpc = new TonRpcClient(config.rpcUrl, config.apiKey)
        this.rpcUrl = config.rpcUrl
        this.apiKey = config.apiKey
        this.signer = config.signer
    }

    // ── Write Operations ───────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        const signer = this.requireSigner()

        const parsedAmount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)
        //TODO fix this check, contract address always have value
        const isNativeToken = !params.sourceAsset.contract

        try {
            let result: { boc: string }

            if (isNativeToken) {
                // Native TON: send UserLock message directly to contract
                const payload = buildUserLockPayload({
                    id: BigInt(params.hashlock),
                    hashlock: BigInt(params.hashlock),
                    amount: parsedAmount,
                    srcReceiver: params.srcSolverAddress,
                    timelock: BigInt(params.timelockDelta ?? 0),
                    senderPubKey: 0n,
                    dstChain: params.destinationChain,
                    dstAsset: params.destinationAsset.contract,
                    dstAddress: params.destinationAddress,
                    srcAsset: params.sourceAsset.symbol ?? '',
                    hopChains: [],
                    hopAssets: [],
                    hopAddresses: [],
                    userData: BigInt(params.nonce),
                })

                const tx = buildTonConnectTx(
                    params.atomicContract,
                    (parsedAmount + toNano(GAS_AMOUNT)).toString(),
                    payload,
                )
                result = await signer.sendTransaction(tx)
            } else {
                // Jetton: build Jetton transfer with UserLock forward payload
                // Resolve Jetton wallet addresses via the RPC client
                const client = this.rpc.getClient()
                const { JettonMaster } = await import('@ton/ton')
                const jettonMasterAddress = Address.parse(params.sourceAsset.contract!)
                const jettonMaster = client.open(JettonMaster.create(jettonMasterAddress))

                const atomicContractAddress = Address.parse(params.atomicContract)
                const userAddress = Address.parse(signer.address)

                const htlcJettonWallet = await jettonMaster.getWalletAddress(atomicContractAddress)
                const senderJettonWallet = await jettonMaster.getWalletAddress(userAddress)

                const { payload, targetAddress, amount } = buildJettonUserLockPayload({
                    id: BigInt(params.hashlock),
                    hashlock: BigInt(params.hashlock),
                    amount: parsedAmount,
                    srcReceiver: params.srcSolverAddress,
                    timelock: BigInt(params.timelockDelta ?? 0),
                    senderPubKey: 0n,
                    dstChain: params.destinationChain,
                    dstAsset: params.destinationAsset.contract,
                    dstAddress: params.destinationAddress,
                    srcAsset: params.sourceAsset.symbol ?? '',
                    hopChains: [],
                    hopAssets: [],
                    hopAddresses: [],
                    userData: BigInt(params.nonce),
                    jettonMasterAddress: params.sourceAsset.contract!,
                    htlcJettonWalletAddress: htlcJettonWallet.toString(),
                    senderJettonWalletAddress: senderJettonWallet.toString(),
                    atomicContract: params.atomicContract,
                    responseDestination: signer.address,
                })

                result = await signer.sendTransaction({
                    validUntil: Math.floor(Date.now() / 1000) + 360,
                    messages: [{ address: targetAddress, amount, payload }],
                })
            }

            const hash = this.extractTxHash(result.boc)
            return { hash, hashlock: params.hashlock, nonce: params.nonce }
        } catch (error) {
            console.error('Error in userLock:', error)
            throw error
        }
    }

    async refund(params: RefundParams): Promise<string> {
        const signer = this.requireSigner()
        const { id, contractAddress } = params

        const payload = buildRefundPayload(BigInt(id))
        const tx = buildTonConnectTx(contractAddress, toNano(GAS_AMOUNT).toString(), payload)

        try {
            const result = await signer.sendTransaction(tx)
            return this.extractTxHash(result.boc)
        } catch (error) {
            console.error('Error in refund:', error)
            throw error
        }
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        const signer = this.requireSigner()
        const { id, contractAddress, secret } = params

        const payload = buildRedeemPayload(BigInt(id), BigInt(secret))
        const tx = buildTonConnectTx(contractAddress, toNano(GAS_AMOUNT).toString(), payload)

        try {
            const result = await signer.sendTransaction(tx)
            return this.extractTxHash(result.boc)
        } catch (error) {
            console.error('Error in redeemSolver:', error)
            throw error
        }
    }

    // ── Read Operations ────────────────────────────────────────────────

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        const { id, contractAddress } = params

        try {
            const args = new TupleBuilder()
            args.writeNumber(BigInt(id))

            const stack = await this.rpc.runMethod(
                contractAddress,
                'getUserLock',
                args.build(),
            )

            return this.parseHTLCFromStack(stack, id, params.decimals)
        } catch (error) {
            console.error('Error in getUserLockDetails:', error)
            return null
        }
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        const { id, contractAddress } = params
        const rpc = TonRpcClient.fromUrl(nodeUrl, this.apiKey)

        try {
            const countArgs = new TupleBuilder()
            countArgs.writeNumber(BigInt(id))

            const countStack = await rpc.runMethod(
                contractAddress,
                'getSolverLockCount',
                countArgs.build(),
            )
            const count = Number(countStack.readNumber())
            if (count === 0) return null

            // TODO: Loop through solver locks by index once getSolverLock is available
            return null
        } catch (error) {
            console.error('Error in getSolverLockDetails:', error)
            return null
        }
    }

    async recoverSwap(txHash: string): Promise<RecoveredSwapData> {
        // Validate TON transaction hash format (64-char hex, with or without 0x prefix)
        if (!/^(0x)?[a-fA-F0-9]{64}$/.test(txHash)) {
            throw new Error('Invalid transaction hash format')
        }

        const cleanHash = txHash.startsWith('0x') ? txHash.slice(2) : txHash

        // Fetch events from TonCenter API v3
        const eventsUrl = `${this.rpcUrl.replace('/api/v2/jsonRPC', '')}/api/v3/events?msg_hash=${cleanHash}`
        const response = await fetch(eventsUrl)
        if (!response.ok) throw new Error('Failed to fetch transaction events')

        const data = await response.json() as TonCenterEvents
        if (!data.events?.length) throw new Error('Transaction not found')

        const transactions = Object.values(data.events[0].transactions)

        // Look for UserLocked or SolverLocked event in out_msgs
        const userLockedOpcodes = [
            '0x' + USER_LOCKED_JETTON_OPCODE.toString(16),
            '0x' + USER_LOCKED_NATIVE_OPCODE.toString(16),
        ]
        const solverLockedOpcodes = [
            '0x' + TOKEN_LOCKED_JETTON_OPCODE.toString(16),
            '0x' + TOKEN_LOCKED_NATIVE_OPCODE.toString(16),
        ]
        const allOpcodes = [...userLockedOpcodes, ...solverLockedOpcodes]

        const eventTx = transactions.find(
            t => t.out_msgs?.some(m => m.destination == null && allOpcodes.includes(m.opcode)),
        )
        const eventMsg = eventTx?.out_msgs?.find(
            m => m.destination == null && allOpcodes.includes(m.opcode),
        )

        if (!eventMsg?.message_content?.body) {
            throw new Error('This transaction does not contain a swap lock')
        }

        // Parse the event cell
        const slice = Cell.fromBase64(eventMsg.message_content.body).beginParse()
        slice.loadUint(32) // skip opcode

        const id = slice.loadIntBig(257)
        const hashlock = '0x' + id.toString(16)

        // Parse common fields from TokenCommitted/TokenLocked event
        // Event layout: id, dstChain, dstAddress, dstAsset, sender, srcReceiver, srcAsset, amount, timelock, ...
        const dstChain = slice.loadStringRefTail()
        const dstAddress = slice.loadStringRefTail()
        const dstAsset = slice.loadStringRefTail()
        const sender = slice.loadAddress().toString()
        const recipient = slice.loadAddress().toString()
        const srcAsset = slice.loadStringRefTail()
        const amount = slice.loadCoins()
        const _timelock = slice.loadIntBig(257)

        return {
            hashlock,
            sender,
            recipient,
            srcChain: '', // Not stored in TON event — derived from contract context
            dstChain,
            token: srcAsset,
            amount,
            dstAddress,
            dstAmount: 0n, // Not stored in TON event
            dstToken: dstAsset,
            srcContract: '', // Derived from contract context when available
        }
    }

    // ── Public Helpers ────────────────────────────────────────────────

    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        try {
            const cleanHash = txHash.startsWith('0x') ? txHash.slice(2) : txHash

            const baseUrl = new URL(this.rpcUrl)
            baseUrl.pathname = '/api/v3/transactions'
            baseUrl.search = `?msg_hash=${cleanHash}&limit=1`
            const url = baseUrl.toString()
            const response = await fetch(url)
            if (!response.ok) return null

            const data = await response.json() as { transactions: any[] }
            if (!data.transactions?.length) return null

            const tx = data.transactions[0]

            return {
                hash: txHash,
                status: tx.description?.aborted
                    ? TransactionStatus.Failed
                    : tx.description?.compute_phase
                        ? TransactionStatus.Confirmed
                        : TransactionStatus.Pending,
                blockNumber: tx.block_ref?.seqno?.toString(),
                blockTimestamp: tx.now ? tx.now * 1000 : undefined,
            }
        } catch {
            return null
        }
    }

    // ── Private Helpers ────────────────────────────────────────────────

    private requireSigner(): TonSigner {
        if (!this.signer) throw new Error('Signer required')
        return this.signer
    }

    private extractTxHash(boc: string): string {
        const cell = Cell.fromBase64(boc)
        const buffer = cell.hash()
        return buffer.toString('hex')
    }

    /**
     * Parse the TupleReader stack from getHTLCDetails into LockDetails.
     *
     * The Tact contract returns an HTLC struct as a tuple:
     * [sender, senderPubKey, srcReceiver, hashlock, amount, timelock]
     * (for Jetton contract: also includes jettonMasterAddress)
     */
    private parseHTLCFromStack(
        stack: any,
        id: string,
        decimals?: number,
    ): UserLockDetails | null {
        try {
            // The getter returns an optional HTLC? — if not found, stack may be empty or contain null
            const items = (stack as any)?.items?.[0]?.items ?? null
            if (!items) return null

            const sender = items[0]?.beginParse?.()?.loadAddress?.()?.toString() ?? null
            if (!sender) return null

            const senderPubKey = items[1] ? BigInt(items[1]) : 0n
            const srcReceiver = items[2]?.beginParse?.()?.loadAddress?.()?.toString() ?? undefined
            const hashlock = items[3] ? BigInt(items[3]) : 0n
            const amount = items[4] ? Number(items[4]) : 0
            const timelock = items[5] ? Number(items[5]) : 0

            return {
                hashlock: hashlock !== 0n ? '0x' + hashlock.toString(16) : id,
                amount: decimals ? Number(formatUnits(BigInt(amount), decimals)) : amount,
                secret: undefined, // Not stored in HTLC struct — only revealed on redeem
                sender,
                recipient: srcReceiver,
                timelock,
                status: LockStatus.Pending, // TON contract doesn't have status enum — presence means Pending
            }
        } catch {
            return null
        }
    }

    /**
     * Parse the TupleReader stack from getSolverLock into LockDetails.
     *
     * Separate from parseHTLCFromStack because the solver lock tuple
     * may differ (e.g. includes reward fields). Layout will be finalized
     * when the TON contract is available.
     */
    private parseSolverLockFromStack(
        stack: any,
        id: string,
        decimals?: number,
    ): Omit<SolverLockDetails, 'index'> | null {
        try {
            const items = (stack as any)?.items?.[0]?.items ?? null
            if (!items) return null

            const sender = items[0]?.beginParse?.()?.loadAddress?.()?.toString() ?? null
            if (!sender) return null

            const srcReceiver = items[1]?.beginParse?.()?.loadAddress?.()?.toString() ?? undefined
            const hashlock = items[2] ? BigInt(items[2]) : 0n
            const amount = items[3] ? Number(items[3]) : 0
            const timelock = items[4] ? Number(items[4]) : 0

            // TODO: Parse reward, rewardTimelock, rewardRecipient, rewardToken, status
            // when TON contract is available
            return {
                hashlock: hashlock !== 0n ? '0x' + hashlock.toString(16) : id,
                amount: decimals ? Number(formatUnits(BigInt(amount), decimals)) : amount,
                secret: undefined,
                sender,
                recipient: srcReceiver,
                timelock,
                status: LockStatus.Pending,
            }
        } catch {
            return null
        }
    }
}

// ── Internal types for TonCenter API v3 ─────────────────────────────────

type TonCenterEvents = {
    events: {
        transactions: {
            [key: string]: {
                out_msgs: {
                    opcode: string
                    destination: string | null
                    message_content: {
                        body: string
                    }
                }[]
            }
        }
    }[]
}
