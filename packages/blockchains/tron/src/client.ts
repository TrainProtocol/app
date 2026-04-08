import { AbiFunction, AbiEvent } from 'ox'
import {
    UserLockParams,
    LockParams,
    RefundParams,
    RedeemSolverParams,
    LockStatus,
    AtomicResult,
    RecoveredSwapData,
    TransactionInfo,
    TransactionStatus,
    HTLCClient,
    parseUnits,
    formatUnits,
    toHex32,
    SignerRequiredError,
    InvalidTxHashError,
} from '@train-protocol/sdk'
import type { UserLockDetails, SolverLockDetails } from '@train-protocol/sdk'
import { htlcFunctions, htlcEvents, trc20Functions, htlcErrorsBySelector } from './abi.js'
import { TronRpcClient, TronRpcError } from './rpc.js'
import type { TronHTLCClientConfig, TronSigner, TronEventLog } from './types.js'
import { ZERO_ADDRESS, DEFAULT_FEE_LIMIT } from './constants.js'
import { toEvmHex, toTronHex, evmHexToBase58, isBase58Address } from './address.js'

type Hex = `0x${string}`
const hex = (v: string): Hex => v as Hex

/**
 * TronGrid function signatures — the API requires human-readable selector strings,
 * NOT hex-encoded 4-byte selectors. TronGrid hashes these strings internally.
 */
const FUNCTION_SIGNATURES = {
    getUserLock: 'getUserLock(bytes32)',
    getSolverLock: 'getSolverLock(bytes32,uint256)',
    getSolverLockCount: 'getSolverLockCount(bytes32)',
    userLock: 'userLock((bytes32,uint256,uint256,uint48,uint48,uint48,address,address,address,string,string,string),(string,string,uint256,string),bytes,bytes)',
    refundUser: 'refundUser(bytes32)',
    redeemSolver: 'redeemSolver(bytes32,uint256,uint256)',
    allowance: 'allowance(address,address)',
    approve: 'approve(address,uint256)',
} as const

/** Strip the 4-byte selector from ABI-encoded calldata, returning only the parameters hex (no 0x prefix) */
function encodeParams(calldata: string): string {
    const clean = calldata.startsWith('0x') ? calldata.slice(2) : calldata
    return clean.slice(8)
}

export class TronHTLCClient extends HTLCClient {
    private rpc: TronRpcClient
    private signer: TronSigner | undefined
    private apiKey: string | undefined

    constructor(config: TronHTLCClientConfig) {
        super()
        this.rpc = new TronRpcClient(config.rpcUrl, config.apiKey)
        this.signer = config.signer
        this.apiKey = config.apiKey
    }

    // ── Write Operations ───────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        const signer = this.requireSigner()
        const { sourceAsset, sourceAddress } = params

        const parsedAmount = parseUnits(params.amount.toString(), sourceAsset.decimals)
        const tokenAddress = sourceAsset.contract || ZERO_ADDRESS
        const isNativeToken = !sourceAsset.contract || sourceAsset.contract === ZERO_ADDRESS

        const ownerHex = toTronHex(sourceAddress)
        const contractHex = toTronHex(params.atomicContract)

        if (!isNativeToken) {
            await this.ensureTRC20Allowance(
                tokenAddress,
                sourceAddress,
                params.atomicContract,
                parsedAmount,
                signer,
            )
        }

        const userData = toHex32(BigInt(params.nonce))
        const calldata = AbiFunction.encodeData(htlcFunctions.userLock, [
            {
                hashlock: hex(params.hashlock),
                amount: parsedAmount,
                rewardAmount: params.rewardAmount || 0n,
                timelockDelta: params.timelockDelta,
                rewardTimelockDelta: params.rewardTimelockDelta ?? 0,
                quoteExpiry: params.quoteExpiry,
                sender: toEvmHex(params.sourceAddress),
                recipient: toEvmHex(params.srcSolverAddress),
                token: toEvmHex(tokenAddress),
                rewardToken: params.rewardToken ? toEvmHex(params.rewardToken) : hex(ZERO_ADDRESS),
                rewardRecipient: params.rewardRecipient ? toEvmHex(params.rewardRecipient) : hex(ZERO_ADDRESS),
                srcChain: params.sourceChain || '',
            },
            {
                dstChain: params.destinationChain,
                dstAddress: params.destinationAddress,
                dstAmount: params.destinationAmount,
                dstToken: params.destinationAsset.contract,
            },
            hex(userData),
            hex(params.solverData || '0x'),
        ])

        const parameter = encodeParams(calldata)

        try {
            // Simulate first
            await this.rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.userLock, parameter, ownerHex)

            // Build and sign
            const unsignedTx = await this.rpc.triggerSmartContract(
                contractHex,
                FUNCTION_SIGNATURES.userLock,
                parameter,
                ownerHex,
                isNativeToken ? Number(parsedAmount) : 0,
                DEFAULT_FEE_LIMIT,
            )

            const hash = await signer.signAndBroadcast(unsignedTx)
            return { hash, hashlock: params.hashlock, nonce: params.nonce }
        } catch (error) {
            const errorName = decodeContractError(error)
            if (errorName) throw new Error(`Contract error: ${errorName}`)
            console.error('Error in userLock:', error)
            throw error
        }
    }

    async refund(params: RefundParams): Promise<string> {
        const signer = this.requireSigner()
        const { id, contractAddress } = params

        const ownerHex = toTronHex(signer.address)
        const contractHex = toTronHex(contractAddress)

        const calldata = AbiFunction.encodeData(htlcFunctions.refundUser, [hex(id)])
        const parameter = encodeParams(calldata)

        try {
            await this.rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.refundUser, parameter, ownerHex)

            const unsignedTx = await this.rpc.triggerSmartContract(
                contractHex, FUNCTION_SIGNATURES.refundUser, parameter, ownerHex, 0, DEFAULT_FEE_LIMIT,
            )

            return signer.signAndBroadcast(unsignedTx)
        } catch (error) {
            const errorName = decodeContractError(error)
            if (errorName) throw new Error(`Contract error: ${errorName}`)
            console.error('Error in refund:', error)
            throw error
        }
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        const signer = this.requireSigner()
        const { id, contractAddress, secret, destinationAddress } = params

        const caller = destinationAddress ?? signer.address
        const ownerHex = toTronHex(caller)
        const contractHex = toTronHex(contractAddress)

        const calldata = AbiFunction.encodeData(htlcFunctions.redeemSolver, [
            hex(id),
            1n,
            BigInt(secret),
        ])
        const parameter = encodeParams(calldata)

        try {
            await this.rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.redeemSolver, parameter, ownerHex)

            const unsignedTx = await this.rpc.triggerSmartContract(
                contractHex, FUNCTION_SIGNATURES.redeemSolver, parameter, ownerHex, 0, DEFAULT_FEE_LIMIT,
            )

            return signer.signAndBroadcast(unsignedTx)
        } catch (error) {
            const errorName = decodeContractError(error)
            if (errorName) throw new Error(`Contract error: ${errorName}`)
            console.error('Error in redeemSolver:', error)
            throw error
        }
    }

    // ── Read Operations ────────────────────────────────────────────────

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        const { id, contractAddress, txId, decimals } = params

        const contractHex = toTronHex(contractAddress)
        // Use a dummy owner for read calls
        const dummyOwner = contractHex

        const calldata = AbiFunction.encodeData(htlcFunctions.getUserLock, [hex(id)])
        const parameter = encodeParams(calldata)
        const raw = await this.rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.getUserLock, parameter, dummyOwner)
        const result = AbiFunction.decodeResult(htlcFunctions.getUserLock, hex('0x' + raw)) as any

        if (!result.timelock) return null

        const lockExists = result.sender !== ZERO_ADDRESS
        let userData: string | undefined
        let blockTimestamp: number | undefined
        let dstAmount: string | undefined

        if (lockExists && txId) {
            try {
                const txInfo = await this.rpc.getTransactionInfoById(txId)
                if (txInfo?.log) {
                    const lockEvent = this.findUserLockedEvent(txInfo.log, id)
                    if (lockEvent?.userData && lockEvent.userData !== '0x') {
                        userData = BigInt(lockEvent.userData as string).toString()
                    }
                    if (lockEvent?.dstAmount != null) {
                        dstAmount = BigInt(lockEvent.dstAmount as string | bigint).toString()
                    }

                    if (txInfo.blockTimeStamp) {
                        blockTimestamp = txInfo.blockTimeStamp
                    }
                }
            } catch (e) {
                console.error('Error fetching userData from tx info:', e)
            }
        }


        return {
            hashlock: lockExists ? id : undefined,
            amount: Number(formatUnits(BigInt(result.amount), decimals)),
            secret: result.secret !== 0n ? BigInt(result.secret) : undefined,
            sender: lockExists ? normalizeResultAddress(result.sender) : undefined,
            recipient: result.recipient !== ZERO_ADDRESS ? normalizeResultAddress(result.recipient) : undefined,
            token: result.token !== ZERO_ADDRESS ? normalizeResultAddress(result.token) : undefined,
            timelock: Number(result.timelock),
            status: lockExists ? Number(result.status) as LockStatus : undefined,
            userData,
            blockTimestamp,
            dstAmount,
        }
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        const { id, contractAddress } = params
        const rpc = new TronRpcClient(nodeUrl, this.apiKey)

        const contractHex = toTronHex(contractAddress)
        const dummyOwner = contractHex

        const countCalldata = AbiFunction.encodeData(htlcFunctions.getSolverLockCount, [hex(id)])
        const countParam = encodeParams(countCalldata)
        const countRaw = await rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.getSolverLockCount, countParam, dummyOwner)
        const count = Number(AbiFunction.decodeResult(htlcFunctions.getSolverLockCount, hex('0x' + countRaw)))

        if (count === 0) return null

        for (let i = 1; i <= count; i++) {
            const result = await this.getSolverLockByIndex(params, i, rpc)
            if (!result) continue
            if (params.solverAddress && normalizeAddress(result.sender ?? '').toLowerCase() !== normalizeAddress(params.solverAddress).toLowerCase()) continue
            return result
        }

        return null
    }

    async recoverSwap(txHash: string): Promise<RecoveredSwapData> {
        // Tron txIDs are 64-char hex without 0x prefix
        if (!/^[a-fA-F0-9]{64}$/.test(txHash))
            throw new InvalidTxHashError()

        const [txInfo, tx] = await Promise.all([
            this.rpc.getTransactionInfoById(txHash),
            this.rpc.getTransactionById(txHash),
        ])

        if (!txInfo || !tx) throw new Error('Transaction not found')

        if (!txInfo.log) throw new Error('This transaction does not contain a swap lock')

        const lockEvent = this.findUserLockedEvent(txInfo.log)
        if (!lockEvent) throw new Error('This transaction does not contain a swap lock')

        const contractAddress = tx.raw_data?.contract?.[0]?.parameter?.value?.contract_address
        const srcContract = contractAddress ? normalizeResultAddress(contractAddress) : ''

        return {
            hashlock: lockEvent.hashlock as string,
            sender: normalizeResultAddress(lockEvent.sender as string),
            recipient: normalizeResultAddress(lockEvent.recipient as string),
            srcChain: lockEvent.srcChain as string,
            dstChain: lockEvent.dstChain as string,
            token: normalizeResultAddress(lockEvent.token as string),
            amount: lockEvent.amount as bigint,
            dstAddress: lockEvent.dstAddress as string,
            dstAmount: lockEvent.dstAmount as bigint,
            dstToken: lockEvent.dstToken as string,
            srcContract,
        }
    }

    // ── Public Helpers ─────────────────────────────────────────────────

    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        try {
            const txInfo = await this.rpc.getTransactionInfoById(txHash)

            if (!txInfo) {
                const tx = await this.rpc.getTransactionById(txHash)
                if (!tx) return null

                return {
                    hash: txHash,
                    status: TransactionStatus.Pending,
                }
            }

            const isFailed = txInfo.result === 'FAILED' || txInfo.receipt?.result === 'REVERT'
            return {
                hash: txHash,
                status: isFailed ? TransactionStatus.Failed : TransactionStatus.Confirmed,
                blockNumber: txInfo.blockNumber?.toString(),
                blockTimestamp: txInfo.blockTimeStamp,
            }
        } catch {
            return null
        }
    }

    // ── Private Helpers ────────────────────────────────────────────────

    private requireSigner(): TronSigner {
        if (!this.signer) throw new SignerRequiredError()
        return this.signer
    }

    private async getSolverLockByIndex(
        params: LockParams,
        index: number,
        rpc: TronRpcClient
    ): Promise<SolverLockDetails | null> {
        const { id, contractAddress } = params
        const contractHex = toTronHex(contractAddress)
        const dummyOwner = contractHex

        const calldata = AbiFunction.encodeData(htlcFunctions.getSolverLock, [hex(id), BigInt(index)])
        const parameter = encodeParams(calldata)
        const raw = await rpc.triggerConstantContract(contractHex, FUNCTION_SIGNATURES.getSolverLock, parameter, dummyOwner)
        const result = AbiFunction.decodeResult(htlcFunctions.getSolverLock, hex('0x' + raw)) as any

        if (result.sender === ZERO_ADDRESS) return null

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals ?? 18)),
            secret: result.secret !== 0n ? BigInt(result.secret) : undefined,
            sender: normalizeResultAddress(result.sender),
            recipient: result.recipient !== ZERO_ADDRESS ? normalizeResultAddress(result.recipient) : undefined,
            token: result.token !== ZERO_ADDRESS ? normalizeResultAddress(result.token) : undefined,
            timelock: Number(result.timelock),
            reward: Number(formatUnits(BigInt(result.reward), params.decimals ?? 18)),
            rewardTimelock: Number(result.rewardTimelock),
            rewardRecipient: result.rewardRecipient !== ZERO_ADDRESS ? normalizeResultAddress(result.rewardRecipient) : undefined,
            rewardToken: result.rewardToken !== ZERO_ADDRESS ? normalizeResultAddress(result.rewardToken) : undefined,
            status: Number(result.status) as LockStatus,
            index,
        }
    }

    private async ensureTRC20Allowance(
        tokenAddress: string,
        owner: string,
        spender: string,
        requiredAmount: bigint,
        signer: TronSigner,
    ): Promise<void> {
        const tokenHex = toTronHex(tokenAddress)
        const ownerHex = toTronHex(owner)

        const allowanceCalldata = AbiFunction.encodeData(trc20Functions.allowance, [
            toEvmHex(owner),
            toEvmHex(spender),
        ])
        const aParam = encodeParams(allowanceCalldata)
        const allowanceRaw = await this.rpc.triggerConstantContract(tokenHex, FUNCTION_SIGNATURES.allowance, aParam, ownerHex)
        const allowance = AbiFunction.decodeResult(trc20Functions.allowance, hex('0x' + allowanceRaw))

        if (allowance >= requiredAmount) return

        const approveCalldata = AbiFunction.encodeData(trc20Functions.approve, [
            toEvmHex(spender),
            requiredAmount,
        ])
        const apParam = encodeParams(approveCalldata)
        const unsignedTx = await this.rpc.triggerSmartContract(
            tokenHex, FUNCTION_SIGNATURES.approve, apParam, ownerHex, 0, DEFAULT_FEE_LIMIT,
        )
        const txId = await signer.signAndBroadcast(unsignedTx)
        await this.waitForConfirmation(txId)
    }

    private async waitForConfirmation(
        txId: string,
        options?: { timeout?: number; interval?: number }
    ): Promise<void> {
        const timeout = options?.timeout ?? 120_000
        const interval = options?.interval ?? 3_000
        const start = Date.now()

        while (Date.now() - start < timeout) {
            const info = await this.rpc.getTransactionInfoById(txId)
            if (info) {
                if (info.result === 'FAILED' || info.receipt?.result === 'REVERT') {
                    throw new Error(`Transaction reverted: ${txId}`)
                }
                return
            }
            await new Promise(r => setTimeout(r, interval))
        }
        throw new Error(`Transaction confirmation timeout after ${timeout}ms: ${txId}`)
    }

    private findUserLockedEvent(logs: TronEventLog[], matchHashlock?: string): Record<string, unknown> | null {
        for (const log of logs) {
            try {
                // TronGrid returns hex without 0x prefix — normalize
                const decoded = AbiEvent.decode(htlcEvents.UserLocked, {
                    data: hex('0x' + log.data),
                    topics: log.topics.map(t => hex('0x' + t)) as [Hex, ...Hex[]],
                }) as unknown as Record<string, unknown>

                if (!matchHashlock || decoded.hashlock === matchHashlock) {
                    return decoded
                }
            } catch {
                // Not a UserLocked event — skip
            }
        }
        return null
    }
}

function decodeContractError(error: unknown): string | null {
    if (error instanceof TronRpcError && typeof error.data === 'object' && error.data) {
        const result = error.data as { constant_result?: string[] }
        if (result.constant_result?.[0]) {
            const selector = '0x' + result.constant_result[0].slice(0, 8)
            return htlcErrorsBySelector[selector] ?? null
        }
    }
    return null
}

/** Convert an EVM hex address from contract results to Base58Check Tron address */
function normalizeResultAddress(address: string): string {
    if (!address) return address
    return evmHexToBase58(address)
}

/** Normalize address for comparison — convert Base58 to EVM hex if needed */
function normalizeAddress(address: string): string {
    if (isBase58Address(address)) return toEvmHex(address)
    if (!address.startsWith('0x')) return '0x' + address
    return address
}
