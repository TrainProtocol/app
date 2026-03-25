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
import { htlcFunctions, htlcEvents, erc20Functions } from './abi.js'
import { JsonRpcClient } from './rpc.js'
import type { EvmHTLCClientConfig, EvmSigner, RpcLog, RpcTransactionReceipt } from './types.js'
import { ZERO_ADDRESS } from './constants.js'

export class EvmHTLCClient extends HTLCClient {
    private rpc: JsonRpcClient
    private signer: EvmSigner | undefined

    constructor(config: EvmHTLCClientConfig) {
        super()
        this.rpc = new JsonRpcClient(config.rpcUrl)
        this.signer = config.signer
    }

    // ── Write Operations ───────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        const signer = this.requireSigner()
        const {
            sourceAsset,
            sourceAddress
        } = params

        const parsedAmount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)
        const tokenAddress = sourceAsset.contractAddress || ZERO_ADDRESS
        const isNativeToken = !sourceAsset.contractAddress || sourceAsset.contractAddress === ZERO_ADDRESS

        if (!isNativeToken) {
            await this.ensureERC20Allowance(
                sourceAsset.contractAddress!,
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
                sender: hex(params.sourceAddress),
                recipient: hex(params.srcLpAddress),
                token: hex(tokenAddress),
                rewardToken: params.rewardToken ?? '',
                rewardRecipient: params.rewardRecipient ?? '',
                srcChain: params.sourceChain || '',
            },
            {
                dstChain: params.destinationChain,
                dstAddress: params.destinationAddress,
                dstAmount: params.destinationAmount,
                dstToken: params.destinationAsset,
            },
            hex(userData),
            hex(params.solverData || '0x'),
        ])

        try {
            await this.rpc.ethCall(
                params.atomicContract,
                calldata,
                sourceAddress,
                isNativeToken ? parsedAmount : undefined,
            )

            const hash = await signer.sendTransaction({
                to: params.atomicContract,
                data: calldata,
                value: isNativeToken ? parsedAmount : undefined,
            })

            return { hash, hashlock: params.hashlock, nonce: params.nonce };
        } catch (error) {
            console.error('Error in userLock:', error);
            throw error;
        }
    }

    async refund(params: RefundParams): Promise<string> {
        const signer = this.requireSigner()
        const { id, contractAddress } = params

        const calldata = AbiFunction.encodeData(htlcFunctions.refundUser, [hex(id)])

        try {
            await this.rpc.ethCall(contractAddress, calldata, signer.address)

            return signer.sendTransaction({ to: contractAddress, data: calldata })
        } catch (error) {
            console.error('Error in refund:', error);
            throw error;
        }
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        const signer = this.requireSigner()
        const { id, contractAddress, secret, destinationAddress } = params

        const caller = destinationAddress ?? signer.address
        const calldata = AbiFunction.encodeData(htlcFunctions.redeemSolver, [
            hex(id),
            1n,
            BigInt(secret),
        ])

        try {
            await this.rpc.ethCall(contractAddress, calldata, caller)

            return signer.sendTransaction({ to: contractAddress, data: calldata })
        } catch (error) {
            console.error('Error in claim:', error);
            throw error;
        }
    }

    // ── Read Operations ────────────────────────────────────────────────

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        const { id, contractAddress, txId } = params

        const calldata = AbiFunction.encodeData(htlcFunctions.getUserLock, [hex(id)])
        const raw = await this.rpc.ethCall(contractAddress, calldata)
        const result = AbiFunction.decodeResult(htlcFunctions.getUserLock, hex(raw)) as any

        const lockExists = result.sender !== ZERO_ADDRESS
        let userData: string | undefined
        let blockTimestamp: number | undefined
        let dstAmount: string | undefined

        if (lockExists && txId) {
            try {
                const receipt = await this.rpc.getTransactionReceipt(txId)
                if (receipt) {
                    const lockEvent = this.findUserLockedEvent(receipt.logs, id)
                    if (lockEvent?.userData && lockEvent.userData !== '0x') {
                        userData = BigInt(lockEvent.userData as string).toString()
                    }
                    if (lockEvent?.dstAmount != null) {
                        dstAmount = BigInt(lockEvent.dstAmount as string | bigint).toString()
                    }

                    const block = await this.rpc.getBlockByNumber(receipt.blockNumber)
                    if (block) {
                        blockTimestamp = Number(BigInt(block.timestamp)) * 1000
                    }
                }
            } catch (e) {
                console.error('Error fetching userData from tx receipt:', e)
            }
        }

        return {
            hashlock: lockExists ? id : undefined,
            amount: Number(formatUnits(BigInt(result.amount), 18)),
            secret: result.secret !== 0n ? BigInt(result.secret) : undefined,
            sender: lockExists ? result.sender : undefined,
            recipient: result.recipient !== ZERO_ADDRESS ? result.recipient : undefined,
            token: result.token !== ZERO_ADDRESS ? result.token : undefined,
            timelock: Number(result.timelock),
            status: lockExists ? Number(result.status) as LockStatus : undefined,
            userData,
            blockTimestamp,
            dstAmount,
        }
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        const { id, contractAddress } = params
        const rpc = new JsonRpcClient(nodeUrl)

        const countData = AbiFunction.encodeData(htlcFunctions.getSolverLockCount, [hex(id)])
        const countRaw = await rpc.ethCall(contractAddress, countData)
        const count = Number(AbiFunction.decodeResult(htlcFunctions.getSolverLockCount, hex(countRaw)))

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
        const { id, contractAddress } = params
        const rpc = new JsonRpcClient(nodeUrl)

        const lockData = AbiFunction.encodeData(htlcFunctions.getSolverLock, [hex(id), BigInt(index)])
        const lockRaw = await rpc.ethCall(contractAddress, lockData)
        const result = AbiFunction.decodeResult(htlcFunctions.getSolverLock, hex(lockRaw)) as any

        if (result.sender === ZERO_ADDRESS) return null

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals ?? 18)),
            secret: result.secret !== 0n ? BigInt(result.secret) : undefined,
            sender: result.sender,
            recipient: result.recipient !== ZERO_ADDRESS ? result.recipient : undefined,
            token: result.token !== ZERO_ADDRESS ? result.token : undefined,
            timelock: Number(result.timelock),
            reward: Number(formatUnits(BigInt(result.reward), params.decimals ?? 18)),
            rewardTimelock: Number(result.rewardTimelock),
            rewardRecipient: result.rewardRecipient !== ZERO_ADDRESS ? result.rewardRecipient : undefined,
            rewardToken: result.rewardToken !== ZERO_ADDRESS ? result.rewardToken : undefined,
            status: Number(result.status) as LockStatus,
            index,
        }
    }

    async recoverSwap(txHash: string): Promise<RecoveredSwapData> {
        if (!/^0x[a-fA-F0-9]{64}$/.test(txHash))
            throw new InvalidTxHashError()

        const [receipt, tx] = await Promise.all([
            this.rpc.getTransactionReceipt(txHash),
            this.rpc.getTransaction(txHash),
        ])

        if (!receipt || !tx) throw new Error('Transaction not found')

        const lockEvent = this.findUserLockedEvent(receipt.logs)
        if (!lockEvent) throw new Error('This transaction does not contain a swap lock')

        return {
            hashlock: lockEvent.hashlock as string,
            sender: lockEvent.sender as string,
            recipient: lockEvent.recipient as string,
            srcChain: lockEvent.srcChain as string,
            dstChain: lockEvent.dstChain as string,
            token: lockEvent.token as string,
            amount: lockEvent.amount as bigint,
            dstAddress: lockEvent.dstAddress as string,
            dstAmount: lockEvent.dstAmount as bigint,
            dstToken: lockEvent.dstToken as string,
            srcContract: tx.to as string,
        }
    }

    // ── Public Helpers ─────────────────────────────────────────────────

    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        try {
            const receipt = await this.rpc.getTransactionReceipt(txHash)

            if (!receipt) {
                const tx = await this.rpc.getTransaction(txHash)
                if (!tx) return null

                return {
                    hash: txHash,
                    status: TransactionStatus.Pending,
                }
            }

            return {
                hash: receipt.transactionHash,
                status: receipt.status === '0x1' ? TransactionStatus.Confirmed : TransactionStatus.Failed,
                blockNumber: receipt.blockNumber,
            }
        } catch {
            return null
        }
    }

    // ── Private Helpers ────────────────────────────────────────────────

    private requireSigner(): EvmSigner {
        if (!this.signer) throw new SignerRequiredError()
        return this.signer
    }

    private async ensureERC20Allowance(
        tokenAddress: string,
        owner: string,
        spender: string,
        requiredAmount: bigint,
        signer: EvmSigner,
    ): Promise<void> {
        const allowanceData = AbiFunction.encodeData(erc20Functions.allowance, [hex(owner), hex(spender)])
        const allowanceRaw = await this.rpc.ethCall(tokenAddress, allowanceData)
        const allowance = AbiFunction.decodeResult(erc20Functions.allowance, hex(allowanceRaw))

        if (allowance >= requiredAmount) return

        const approveData = AbiFunction.encodeData(erc20Functions.approve, [hex(spender), requiredAmount])
        const approveHash = await signer.sendTransaction({ to: tokenAddress, data: approveData })
        await this.waitForReceipt(this.rpc, approveHash)
    }

    private async waitForReceipt(
        rpc: JsonRpcClient,
        txHash: string,
        options?: { timeout?: number; interval?: number }
    ): Promise<RpcTransactionReceipt> {
        const timeout = options?.timeout ?? 120_000
        const interval = options?.interval ?? 2_000
        const start = Date.now()
    
        while (Date.now() - start < timeout) {
            const receipt = await rpc.getTransactionReceipt(txHash)
            if (receipt) {
                if (receipt.status === '0x0') {
                    throw new Error(`Transaction reverted: ${txHash}`)
                }
                return receipt
            }
            await new Promise(r => setTimeout(r, interval))
        }
        throw new Error(`Transaction receipt timeout after ${timeout}ms: ${txHash}`)
    }

    private findUserLockedEvent(logs: RpcLog[], matchHashlock?: string): Record<string, unknown> | null {
        for (const log of logs) {
            try {
                const decoded = AbiEvent.decode(htlcEvents.UserLocked, {
                    data: hex(log.data),
                    topics: log.topics as [Hex, ...Hex[]],
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

type Hex = `0x${string}`
const hex = (v: string): Hex => v as Hex