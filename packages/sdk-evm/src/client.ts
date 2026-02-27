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
    IHTLCClient,
} from '@train-protocol/sdk'
import { htlcFunctions, htlcEvents, erc20Functions } from './abi.js'
import { JsonRpcClient } from './rpc.js'
import { ZERO_ADDRESS, parseUnits, formatUnits, toHex32, waitForReceipt } from './utils.js'
import type { EvmHTLCClientConfig, EvmSigner, RpcLog } from './types.js'

export class EvmHTLCClient implements IHTLCClient {
    private rpc: JsonRpcClient
    private signer: EvmSigner | undefined

    constructor(config: EvmHTLCClientConfig) {
        this.rpc = new JsonRpcClient(config.rpcUrl)
        this.signer = config.signer
    }

    async createHTLC(
        params: CreateHTLCParams
    ): Promise<AtomicResult> {
        const {
            destinationChain,
            sourceChain,
            destinationAsset,
            sourceAsset,
            srcLpAddress: lpAddress,
            address,
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

        if (!this.signer) throw new Error('Signer required for createHTLC')

        const parsedAmount = parseUnits(amount.toString(), decimals)
        const tokenAddress = sourceAsset.contractAddress || ZERO_ADDRESS
        const isNativeToken = !sourceAsset.contractAddress || sourceAsset.contractAddress === ZERO_ADDRESS

        // Handle ERC20 approval
        if (!isNativeToken && sourceAsset.contractAddress) {
            const allowanceData = AbiFunction.encodeData(erc20Functions.allowance, [
                address as `0x${string}`,
                atomicContract as `0x${string}`,
            ])
            const allowanceResult = await this.rpc.ethCall(sourceAsset.contractAddress, allowanceData)
            const allowance = AbiFunction.decodeResult(erc20Functions.allowance, allowanceResult as `0x${string}`)

            if (allowance < parsedAmount) {
                const approveData = AbiFunction.encodeData(erc20Functions.approve, [
                    atomicContract as `0x${string}`,
                    parsedAmount,
                ])
                const approveHash = await this.signer.sendTransaction({
                    to: sourceAsset.contractAddress,
                    data: approveData,
                })
                await waitForReceipt(this.rpc, approveHash)
            }
        }

        const userLockParams = {
            hashlock: hashlock as `0x${string}`,
            amount: parsedAmount,
            rewardAmount: rewardAmount || 0n,
            timelockDelta,
            rewardTimelockDelta: rewardTimelockDelta ?? 0,
            quoteExpiry,
            sender: address as `0x${string}`,
            recipient: lpAddress as `0x${string}`,
            token: tokenAddress as `0x${string}`,
            rewardToken: rewardToken ?? '',
            rewardRecipient: rewardRecipient ?? '',
            srcChain: sourceChain || '',
        }

        const destinationInfo = {
            dstChain: destinationChain,
            dstAddress: address,
            dstAmount: destinationAmount,
            dstToken: destinationAsset,
        }

        const userData = toHex32(BigInt(timestamp))
        const calldata = AbiFunction.encodeData(htlcFunctions.userLock, [
            userLockParams,
            destinationInfo,
            userData as `0x${string}`,
            (solverData || '0x') as `0x${string}`,
        ])

        // Simulate via eth_call before sending
        await this.rpc.ethCall(
            atomicContract,
            calldata,
            address,
            isNativeToken ? parsedAmount : undefined
        )

        const hash = await this.signer.sendTransaction({
            to: atomicContract,
            data: calldata,
            value: isNativeToken ? parsedAmount : undefined,
        })

        return { hash, hashlock, nonce: timestamp }
    }

    async getUserLockDetails(params: LockParams): Promise<LockDetails | null> {
        const { id, contractAddress, txId } = params

        const calldata = AbiFunction.encodeData(htlcFunctions.getUserLock, [id as `0x${string}`])
        const raw = await this.rpc.ethCall(contractAddress, calldata)
        const result = AbiFunction.decodeResult(htlcFunctions.getUserLock, raw as `0x${string}`) as any

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
            secret: result.secret != 0n ? BigInt(result.secret) : undefined,
            sender: lockExists ? result.sender : undefined,
            recipient: result.recipient !== ZERO_ADDRESS ? result.recipient : undefined,
            token: result.token !== ZERO_ADDRESS ? result.token : undefined,
            timelock: Number(result.timelock),
            status: lockExists ? Number(result.status) as LockStatus : undefined,
            claimed: Number(result.status),
            userData,
            blockTimestamp,
        }
    }

    async getSolverLockDetails(params: LockParams): Promise<LockDetails | null> {
        const { id, contractAddress } = params

        const countData = AbiFunction.encodeData(htlcFunctions.getSolverLockCount, [id as `0x${string}`])
        const countRaw = await this.rpc.ethCall(contractAddress, countData)
        const count = AbiFunction.decodeResult(htlcFunctions.getSolverLockCount, countRaw as `0x${string}`)

        if (Number(count) === 0) return null

        const lockData = AbiFunction.encodeData(htlcFunctions.getSolverLock, [id as `0x${string}`, 1n])
        const lockRaw = await this.rpc.ethCall(contractAddress, lockData)
        const result = AbiFunction.decodeResult(htlcFunctions.getSolverLock, lockRaw as `0x${string}`) as any

        const lockExists = result.sender !== ZERO_ADDRESS
        if (!lockExists) return null

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals ?? 18)),
            secret: result.secret != 0n ? BigInt(result.secret) : undefined,
            sender: result.sender,
            recipient: result.recipient !== ZERO_ADDRESS ? result.recipient : undefined,
            token: result.token !== ZERO_ADDRESS ? result.token : undefined,
            timelock: Number(result.timelock),
            reward: Number(formatUnits(BigInt(result.reward), params.decimals ?? 18)),
            rewardTimelock: Number(result.rewardTimelock),
            rewardRecipient: result.rewardRecipient !== ZERO_ADDRESS ? result.rewardRecipient : undefined,
            rewardToken: result.rewardToken !== ZERO_ADDRESS ? result.rewardToken : undefined,
            status: Number(result.status) as LockStatus,
            claimed: Number(result.status),
            index: 0,
        }
    }

    async secureGetDetails(
        params: LockParams,
        nodeUrls: string[],
    ): Promise<LockDetails | null> {
        const { id, contractAddress } = params

        const calldata = AbiFunction.encodeData(htlcFunctions.getUserLock, [id as `0x${string}`])

        const results = await Promise.all(
            nodeUrls.map(async (url) => {
                const rpc = new JsonRpcClient(url)
                const raw = await rpc.ethCall(contractAddress, calldata)
                return AbiFunction.decodeResult(htlcFunctions.getUserLock, raw as `0x${string}`) as any
            })
        )

        const validResults = results.filter(r => BigInt(r.amount) > 0n)
        if (!validResults.length) return null

        const [firstResult, ...otherResults] = validResults
        if (!otherResults.every(r => BigInt(r.amount) === BigInt(firstResult.amount))) {
            throw new Error('Lock details do not match across the provided nodes')
        }

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(firstResult.amount), params.decimals ?? 18)),
            secret: firstResult.secret != 0n ? BigInt(firstResult.secret) : undefined,
            sender: firstResult.sender !== ZERO_ADDRESS ? firstResult.sender : undefined,
            recipient: firstResult.recipient !== ZERO_ADDRESS ? firstResult.recipient : undefined,
            token: firstResult.token !== ZERO_ADDRESS ? firstResult.token : undefined,
            timelock: Number(firstResult.timelock),
            status: Number(firstResult.status) as LockStatus,
            claimed: Number(firstResult.status),
            userData: firstResult.userData !== ZERO_ADDRESS ? Number(firstResult.userData).toString() : undefined,
        }
    }

    async refund(params: RefundParams): Promise<string> {
        if (!this.signer) throw new Error('Signer required for refund')
        const { id, contractAddress } = params

        const calldata = AbiFunction.encodeData(htlcFunctions.refundUser, [id as `0x${string}`])

        // Simulate via eth_call
        await this.rpc.ethCall(contractAddress, calldata, this.signer.address)

        return await this.signer.sendTransaction({
            to: contractAddress,
            data: calldata,
        })
    }

    async claim(params: ClaimParams): Promise<string> {
        if (!this.signer) throw new Error('Signer required for claim')
        const { id, contractAddress, secret, destinationAddress } = params

        const account = destinationAddress ?? this.signer.address

        const calldata = AbiFunction.encodeData(htlcFunctions.redeemSolver, [
            id as `0x${string}`,
            1n,
            BigInt(secret),
        ])

        // Simulate via eth_call
        await this.rpc.ethCall(contractAddress, calldata, account)

        return await this.signer.sendTransaction({
            to: contractAddress,
            data: calldata,
        })
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

    /** Parse UserLocked event from raw RPC logs */
    private findUserLockedEvent(logs: RpcLog[], matchHashlock?: string): Record<string, unknown> | null {
        for (const log of logs) {
            try {
                const decoded = AbiEvent.decode(htlcEvents.UserLocked, {
                    data: log.data as `0x${string}`,
                    topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
                }) as unknown as Record<string, unknown>
                if (!matchHashlock || decoded.hashlock === matchHashlock) {
                    return decoded
                }
            } catch {
                // Not a UserLocked event, skip
            }
        }
        return null
    }
}
