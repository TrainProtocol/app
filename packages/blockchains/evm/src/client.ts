import { AbiFunction, AbiEvent } from 'ox'
import {
    UserLockParams,
    LockParams,
    RefundParams,
    RedeemSolverParams,
    LockStatus,
    AtomicResult,
    Network,
    TransactionInfo,
    TransactionStatus,
    HTLCClient,
    parseUnits,
    formatUnits,
    toHex32,
    SignerRequiredError,
    InvalidTxHashError,
} from '@train-protocol/sdk'
import type { UserLockDetails, SolverLockDetails, BaseLockDetails, EventDerivedData } from '@train-protocol/sdk'
import { htlcFunctions, htlcEvents, erc20Functions } from './abi.js'
import { JsonRpcClient } from './rpc.js'
import type { EvmHTLCClientConfig, EvmSigner, RpcLog, RpcTransactionReceipt } from './types.js'
import { ZERO_ADDRESS } from './constants.js'
import { pickEventDerivedData } from './helpers.js'
import { decodeContractError, Hex, hex } from './utils.js'

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
        const { sourceAsset, sourceAddress } = params

        const parsedAmount = parseUnits(params.amount.toString(), sourceAsset.decimals)
        const tokenAddress = sourceAsset.contract || ZERO_ADDRESS
        const isNativeToken = !sourceAsset.contract || sourceAsset.contract === ZERO_ADDRESS

        if (!isNativeToken) {
            await this.ensureERC20Allowance(
                sourceAsset.contract!,
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
                recipient: hex(params.srcSolverAddress),
                token: hex(tokenAddress),
                rewardToken: params.rewardToken ?? '',
                rewardRecipient: params.rewardRecipient ?? '',
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
            const errorName = decodeContractError(error)
            if (errorName) throw new Error(`Contract error: ${errorName}`)
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
            const errorName = decodeContractError(error)
            if (errorName) throw new Error(`Contract error: ${errorName}`)
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
            const errorName = decodeContractError(error)
            if (errorName) throw new Error(`Contract error: ${errorName}`)
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
        if (!lockExists) return null

        const parsedResult: BaseLockDetails = {
            ...result,
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
            secret: BigInt(result.secret),
            timelock: Number(result.timelock),
            status: Number(result.status) as LockStatus,
        }

        let blockTimestamp: number | undefined
        let eventDerivedData = {} as Partial<EventDerivedData>

        if (lockExists && txId) {
            try {
                const receipt = await this.rpc.getTransactionReceipt(txId)
                if (receipt) {
                    const lockEvent = this.findUserLockedEvent(receipt.logs, id)
                    if (lockEvent) {
                        eventDerivedData = pickEventDerivedData(lockEvent)
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

        return { ...parsedResult, ...eventDerivedData, blockTimestamp }
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
            ...result,
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
            secret: BigInt(result.secret),
            timelock: Number(result.timelock),
            status: Number(result.status) as LockStatus,
            index
        }
    }

    async recoverSwap(txHash: string, network: Network): Promise<UserLockDetails> {
        if (!/^0x[a-fA-F0-9]{64}$/.test(txHash))
            throw new InvalidTxHashError()

        const receipt = await this.rpc.getTransactionReceipt(txHash)
        if (!receipt) throw new Error('Transaction not found')

        const lockEvent = this.findUserLockedEvent(receipt.logs)
        if (!lockEvent) throw new Error('This transaction does not contain a swap lock')

        const token = network.tokens.find(t => t.contract?.toLowerCase() === (lockEvent.token as string).toLowerCase())
        if (!token)throw new Error('Token not found')

        const result = await this.getUserLockDetails({
            id: lockEvent.hashlock as string,
            contractAddress: network.trainContract,
            decimals: token?.decimals,
            txId: txHash,
            chainId: network.chainId,
        })

        if (!result) throw new Error('Lock not found for recovered hashlock')

        return result
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