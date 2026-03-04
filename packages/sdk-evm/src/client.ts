import { AbiFunction, AbiEvent } from 'ox'
import {
    CreateHTLCParams,
    LockParams,
    RefundParams,
    ClaimParams,
    LockDetails,
    LockStatus,
    AtomicResult,
    RecoveredSwapData,
    HTLCClient,
} from '@train-protocol/sdk'
import { htlcFunctions, htlcEvents, erc20Functions } from './abi.js'
import { JsonRpcClient } from './rpc.js'
import { parseUnits, formatUnits, toHex32 } from '@train-protocol/sdk'
import { waitForReceipt } from './utils.js'
import type { EvmHTLCClientConfig, EvmSigner, RpcLog } from './types.js'

export class EvmHTLCClient extends HTLCClient {
    private rpc: JsonRpcClient
    private signer: EvmSigner | undefined

    constructor(config: EvmHTLCClientConfig) {
        super(config.apiClient)
        this.rpc = new JsonRpcClient(config.rpcUrl)
        this.signer = config.signer
    }

    // ── Write Operations ───────────────────────────────────────────────

    async createHTLC(params: CreateHTLCParams): Promise<AtomicResult> {
        const signer = this.requireSigner()
        const {
            destinationChain,
            sourceChain,
            destinationAsset,
            sourceAsset,
            srcLpAddress: lpAddress,
            sourceAddress,
            destinationAddress,
            amount,
            decimals,
            atomicContract,
            quoteExpiry,
            rewardToken,
            rewardRecipient,
            rewardAmount,
            rewardTimelockDelta,
            solverData,
            destinationAmount,
            timelockDelta,
            hashlock,
            nonce: timestamp,
        } = params

        const parsedAmount = parseUnits(amount.toString(), decimals)
        const tokenAddress = sourceAsset.contractAddress || ZERO_ADDRESS
        const isNativeToken = !sourceAsset.contractAddress || sourceAsset.contractAddress === ZERO_ADDRESS

        if (!isNativeToken) {
            await this.ensureERC20Allowance(
                sourceAsset.contractAddress!,
                sourceAddress,
                atomicContract,
                parsedAmount,
                signer,
            )
        }

        const userData = toHex32(BigInt(timestamp))
        const calldata = AbiFunction.encodeData(htlcFunctions.userLock, [
            {
                hashlock: hex(hashlock),
                amount: parsedAmount,
                rewardAmount: rewardAmount || 0n,
                timelockDelta,
                rewardTimelockDelta: rewardTimelockDelta ?? 0,
                quoteExpiry,
                sender: hex(sourceAddress),
                recipient: hex(lpAddress),
                token: hex(tokenAddress),
                rewardToken: rewardToken ?? '',
                rewardRecipient: rewardRecipient ?? '',
                srcChain: sourceChain || '',
            },
            {
                dstChain: destinationChain,
                dstAddress: destinationAddress,
                dstAmount: destinationAmount,
                dstToken: destinationAsset,
            },
            hex(userData),
            hex(solverData || '0x'),
        ])

        try {
            await this.rpc.ethCall(
                atomicContract,
                calldata,
                sourceAddress,
                isNativeToken ? parsedAmount : undefined,
            )

            const hash = await signer.sendTransaction({
                to: atomicContract,
                data: calldata,
                value: isNativeToken ? parsedAmount : undefined,
            })

            return { hash, hashlock, nonce: timestamp };
        } catch (error) {
            console.error('Error in createHTLC:', error);
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
            console.error('Error in createHTLC:', error);
            throw error;
        }
    }

    async claim(params: ClaimParams): Promise<string> {
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
            console.error('Error in createHTLC:', error);
            throw error;
        }
    }

    // ── Read Operations ────────────────────────────────────────────────

    async getUserLockDetails(params: LockParams): Promise<LockDetails | null> {
        const { id, contractAddress, txId } = params

        const calldata = AbiFunction.encodeData(htlcFunctions.getUserLock, [hex(id)])
        const raw = await this.rpc.ethCall(contractAddress, calldata)
        const result = AbiFunction.decodeResult(htlcFunctions.getUserLock, hex(raw)) as any

        const lockExists = result.sender !== ZERO_ADDRESS
        let userData: string | undefined
        let blockTimestamp: number | undefined

        if (lockExists && txId) {
            try {
                const receipt = await this.rpc.getTransactionReceipt(txId)
                if (receipt) {
                    const lockEvent = this.findUserLockedEvent(receipt.logs, id)
                    if (lockEvent?.userData && lockEvent.userData !== '0x') {
                        userData = BigInt(lockEvent.userData as string).toString()
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
        }
    }

    async getSolverLockDetails(params: LockParams): Promise<LockDetails | null> {
        const { id, contractAddress } = params

        const countData = AbiFunction.encodeData(htlcFunctions.getSolverLockCount, [hex(id)])
        const countRaw = await this.rpc.ethCall(contractAddress, countData)
        const count = Number(AbiFunction.decodeResult(htlcFunctions.getSolverLockCount, hex(countRaw)))

        if (count === 0) return null

        for (let i = 1; i <= count; i++) {
            const lockData = AbiFunction.encodeData(htlcFunctions.getSolverLock, [hex(id), BigInt(i)])
            const lockRaw = await this.rpc.ethCall(contractAddress, lockData)
            const result = AbiFunction.decodeResult(htlcFunctions.getSolverLock, hex(lockRaw)) as any

            if (result.sender === ZERO_ADDRESS) continue

            if (params.solverAddress && result.sender.toLowerCase() !== params.solverAddress.toLowerCase()) continue

            const solverLock = {
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
            }
            return solverLock
        }

        return null
    }

    async secureGetDetails(params: LockParams, nodeUrls: string[]): Promise<LockDetails | null> {
        const { id, contractAddress } = params

        const calldata = AbiFunction.encodeData(htlcFunctions.getUserLock, [hex(id)])
        const results = await Promise.all(
            nodeUrls.map(async (url) => {
                const rpc = new JsonRpcClient(url)
                const raw = await rpc.ethCall(contractAddress, calldata)
                return AbiFunction.decodeResult(htlcFunctions.getUserLock, hex(raw)) as any
            }),
        )

        const validResults = results.filter(r => BigInt(r.amount) > 0n)
        if (!validResults.length) return null

        const [first, ...rest] = validResults
        if (!rest.every(r => BigInt(r.amount) === BigInt(first.amount))) {
            throw new Error('Lock details do not match across the provided nodes')
        }

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(first.amount), params.decimals ?? 18)),
            secret: first.secret !== 0n ? BigInt(first.secret) : undefined,
            sender: first.sender !== ZERO_ADDRESS ? first.sender : undefined,
            recipient: first.recipient !== ZERO_ADDRESS ? first.recipient : undefined,
            token: first.token !== ZERO_ADDRESS ? first.token : undefined,
            timelock: Number(first.timelock),
            status: Number(first.status) as LockStatus,
            userData: first.userData !== ZERO_ADDRESS ? Number(first.userData).toString() : undefined,
        }
    }

    async recoverSwap(txHash: string): Promise<RecoveredSwapData> {
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

    // ── Private Helpers ────────────────────────────────────────────────

    private requireSigner(): EvmSigner {
        if (!this.signer) throw new Error('Signer required')
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
        await waitForReceipt(this.rpc, approveHash)
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

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'