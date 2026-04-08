import { cairo, CallData, Contract, hash, num, addAddressPadding, ProviderOrAccount, RpcProvider, type Call, byteArray } from 'starknet'
import {
    UserLockParams,
    LockParams,
    RefundParams,
    RedeemSolverParams,
    LockStatus,
    AtomicResult,
    TransactionInfo,
    TransactionStatus,
    HTLCClient,
    parseUnits,
    formatUnits,
} from '@train-protocol/sdk'
import type { UserLockDetails, SolverLockDetails, BaseLockDetails, EventDerivedData, Network } from '@train-protocol/sdk'
import type { StarknetHTLCClientConfig, StarknetSigner } from './types.js'
import htlcAbi from './abis/STARKNET_HTLC.json' with { type: 'json' }
import { ERC20_ABI } from './abis/ERC20.js'
import { ZERO_ADDRESS } from './constants.js'
import { formatStarknetAddress } from './utils.js'

export class StarknetHTLCClient extends HTLCClient {
    private provider: RpcProvider
    private signer: StarknetSigner | undefined

    constructor(config: StarknetHTLCClientConfig) {
        super()
        this.provider = new RpcProvider({ nodeUrl: config.rpcUrl })
        this.signer = config.signer
        this.consensusOptions = { minQuorum: 1, batchSize: 1 }
    }

    // ── Write Operations ───────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        const signer = this.requireSigner()

        const parsedAmount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)
        const tokenAddress = params.sourceAsset.contract || ZERO_ADDRESS

        // ERC20 approval
        const erc20 = new Contract({ abi: ERC20_ABI, address: tokenAddress, providerOrAccount: signer.account })
        const approveCall: Call = erc20.populate("approve", [params.atomicContract, cairo.uint256(parsedAmount)])

        // Build user_lock call
        const userLockCall: Call = {
            contractAddress: params.atomicContract,
            entrypoint: 'user_lock',
            calldata: CallData.compile([
                {
                    hashlock: cairo.uint256(BigInt(params.hashlock)),
                    amount: cairo.uint256(parsedAmount),
                    reward_amount: cairo.uint256(params.rewardAmount ? BigInt(params.rewardAmount) : 0n),
                    timelock_delta: params.timelockDelta,
                    reward_timelock_delta: params.rewardTimelockDelta,
                    quote_expiry: params.quoteExpiry,
                    sender: params.sourceAddress,
                    recipient: params.srcSolverAddress,
                    token: tokenAddress,
                    reward_token: byteArray.byteArrayFromString(params.rewardToken ?? ''),
                    reward_recipient: byteArray.byteArrayFromString(params.rewardRecipient ?? ''),
                    src_chain: byteArray.byteArrayFromString(params.sourceChain || ''),
                },
                {
                    dst_chain: byteArray.byteArrayFromString(params.destinationChain),
                    dst_address: byteArray.byteArrayFromString(params.destinationAddress),
                    dst_amount: cairo.uint256(BigInt(params.destinationAmount)),
                    dst_token: byteArray.byteArrayFromString(params.destinationAsset.contract),
                },
                byteArray.byteArrayFromString(String(params.nonce)),  // userData — nonce timestamp for recovery
                byteArray.byteArrayFromString(params.solverData || ''),
            ]),
        }

        try {
            const { transaction_hash } = await signer.account.execute([approveCall, userLockCall])
            await signer.account.waitForTransaction(transaction_hash)

            return { hash: transaction_hash, hashlock: params.hashlock, nonce: params.nonce }
        } catch (error) {
            console.error('Error in userLock:', error)
            throw error
        }
    }

    async refund(params: RefundParams): Promise<string> {
        const signer = this.requireSigner()
        const { id, contractAddress } = params

        const contract = this.createContract(contractAddress, signer.account)

        try {
            const resp = await contract.invoke('refund_user', [cairo.uint256(BigInt(id))])
            await signer.account.waitForTransaction(resp.transaction_hash)
            return resp.transaction_hash
        } catch (error) {
            console.error('Error in refund:', error)
            throw error
        }
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        const signer = this.requireSigner()
        const { id, contractAddress, secret, index } = params

        const contract = this.createContract(contractAddress, signer.account)

        try {
            const resp = await contract.invoke('redeem_solver', [
                cairo.uint256(BigInt(id)),
                cairo.uint256(BigInt(index ?? 1)),
                cairo.uint256(BigInt(secret)),
            ])
            await signer.account.waitForTransaction(resp.transaction_hash)
            return resp.transaction_hash
        } catch (error) {
            console.error('Error in redeemSolver:', error)
            throw error
        }
    }

    // ── Read Operations ────────────────────────────────────────────────

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        const { id, contractAddress, txId } = params
        const contract = this.createContract(contractAddress, this.provider)

        try {
            const result = await contract.get_user_lock(cairo.uint256(BigInt(id)))

            const sender = '0x' + BigInt(result.sender).toString(16)
            if (sender === ZERO_ADDRESS || BigInt(result.sender) === 0n) {
                return null
            }

            const parsedResult: BaseLockDetails = {
                hashlock: id,
                amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
                secret: BigInt(result.secret),
                timelock: Number(result.timelock),
                status: this.mapLockStatus(result.status),
                sender,
                recipient: formatStarknetAddress(result.recipient).toString(),
                token: formatStarknetAddress(result.token).toString(),
            }

            let eventDerivedData = {} as Partial<EventDerivedData>

            if (txId) {
                try {
                    const event = await this.findUserLockedEvent(txId, id)
                    if (event) {
                        eventDerivedData = this.pickStarknetEventData(event)
                    }
                } catch (e) {
                    console.error('Error fetching event data from tx receipt:', e)
                }
            }

            return { ...parsedResult, ...eventDerivedData }
        } catch (error) {
            console.error('Error in getUserLockDetails:', error)
            return null
        }
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        const { id, contractAddress } = params
        const provider = new RpcProvider({ nodeUrl })
        const contract = this.createContract(contractAddress, provider)

        const count = Number(await contract.get_solver_lock_count(cairo.uint256(BigInt(id))))
        if (count === 0) return null

        for (let i = 1; i <= count; i++) {
            const result = await this.getSolverLockByIndex(params, i, nodeUrl)
            if (!result) continue
            if (params.solverAddress && formatStarknetAddress(result.sender ?? '').toLowerCase() !== formatStarknetAddress(params.solverAddress).toLowerCase()) continue
            return result
        }

        return null
    }

    async getSolverLockByIndex(params: LockParams, index: number, nodeUrl: string): Promise<SolverLockDetails | null> {
        const { id, contractAddress } = params
        const provider = new RpcProvider({ nodeUrl })
        const contract = this.createContract(contractAddress, provider)

        const result = await contract.get_solver_lock(cairo.uint256(BigInt(id)), cairo.uint256(BigInt(index)))

        if (BigInt(result.sender) === 0n) return null

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
            secret: BigInt(result.secret),
            timelock: Number(result.timelock),
            status: this.mapLockStatus(result.status),
            sender: formatStarknetAddress(result.sender).toString(),
            recipient: formatStarknetAddress(result.recipient).toString(),
            token: formatStarknetAddress(result.token).toString(),
            reward: Number(formatUnits(BigInt(result.reward), params.decimals)),
            rewardTimelock: Number(result.reward_timelock),
            rewardRecipient: formatStarknetAddress(result.reward_recipient).toString(),
            rewardToken: formatStarknetAddress(result.reward_token).toString(),
            index,
        }
    }

    async recoverSwap(txHash: string, network: Network): Promise<UserLockDetails> {
        if (!/^0x[a-fA-F0-9]{1,64}$/.test(txHash))
            throw new Error('Invalid transaction hash format')

        const event = await this.findUserLockedEvent(txHash)
        if (!event) throw new Error('This transaction does not contain a swap lock')

        const eventHashlock = addAddressPadding(num.toHex(event.hashlock))
        const eventToken = addAddressPadding(num.toHex(event.token))

        const token = network.tokens.find(t => t.contract?.toLowerCase() === eventToken.toLowerCase())
        if(!token) throw new Error('Token not found')
        const decimals = token?.decimals

        const result = await this.getUserLockDetails({
            id: eventHashlock,
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
        try {
            const receipt = await this.provider.getTransactionReceipt(txHash)
            if (!receipt) return null

            const executionStatus = 'execution_status' in receipt
                ? (receipt as any).execution_status as string
                : undefined

            return {
                hash: txHash,
                status: executionStatus === 'REVERTED'
                    ? TransactionStatus.Failed
                    : executionStatus === 'SUCCEEDED'
                        ? TransactionStatus.Confirmed
                        : TransactionStatus.Pending,
                blockNumber: 'block_number' in receipt
                    ? String((receipt as any).block_number)
                    : undefined,
            }
        } catch {
            return null
        }
    }

    // ── Private Helpers ────────────────────────────────────────────────

    private requireSigner(): StarknetSigner {
        if (!this.signer) throw new Error('Signer required')
        return this.signer
    }

    private createContract(address: string, providerOrAccount: ProviderOrAccount): Contract {
        return new Contract({ abi: htlcAbi, address, providerOrAccount })
    }

    private async findUserLockedEvent(txHash: string, matchHashlock?: string): Promise<Record<string, any> | null> {
        const receipt = await this.provider.getTransactionReceipt(txHash)
        if (!receipt || !('events' in receipt)) return null

        const userLockedSelector = hash.getSelectorFromName('UserLocked')
        const rawEvent = receipt.events.find(e => e.keys.includes(userLockedSelector))
        if (!rawEvent) return null

        const contract = this.createContract(rawEvent.from_address, this.provider)
        const parsed = contract.parseEvents(receipt)

        const userLockedEntry = parsed.find(
            ev => Object.keys(ev).some(k => k.includes('UserLocked'))
        )
        if (!userLockedEntry) return null

        const eventKey = Object.keys(userLockedEntry).find(k => k.includes('UserLocked'))!
        const event = userLockedEntry[eventKey] as Record<string, any>

        if (matchHashlock) {
            const eventHashlock = addAddressPadding(num.toHex(event.hashlock))
            if (eventHashlock.toLowerCase() !== matchHashlock.toLowerCase()) return null
        }

        return event
    }

    private pickStarknetEventData(event: Record<string, any>): Partial<EventDerivedData> {
        const data: Partial<EventDerivedData> = {}
        if (event.dst_chain != null) data.dstChain = event.dst_chain as string
        if (event.dst_address != null) data.dstAddress = event.dst_address as string
        if (event.dst_amount != null) data.dstAmount = BigInt(event.dst_amount)
        if (event.dst_token != null) {
            const raw = event.dst_token as string
            data.dstToken = !raw || /^[\u0000]+$/.test(raw) ? '0x0000000000000000000000000000000000000000' : raw
        }
        if (event.userData != null || event.user_data != null) data.userData = (event.userData ?? event.user_data) as string
        if (event.solverData != null || event.solver_data != null) data.solverData = (event.solverData ?? event.solver_data) as string
        return data
    }

    private mapLockStatus(cairoStatus: any): LockStatus {
        // CairoCustomEnum — activeVariant is a METHOD, must be called
        if (typeof cairoStatus?.activeVariant === 'function') {
            const variant = cairoStatus.activeVariant() as string
            switch (variant) {
                case 'Pending': return LockStatus.Pending
                case 'Redeemed': return LockStatus.Redeemed
                case 'Refunded': return LockStatus.Refunded
                default: return LockStatus.Empty
            }
        }
        // Fallback: plain number/bigint
        if (typeof cairoStatus === 'number' || typeof cairoStatus === 'bigint') {
            return Number(cairoStatus) as LockStatus
        }
        // Fallback: { variant: { Refunded: {}, ... } } — active key has an object value
        if (cairoStatus?.variant && typeof cairoStatus.variant === 'object') {
            const variantKey = Object.keys(cairoStatus.variant).find(
                k => cairoStatus.variant[k] !== undefined
            )
            switch (variantKey) {
                case 'Pending': return LockStatus.Pending
                case 'Redeemed': return LockStatus.Redeemed
                case 'Refunded': return LockStatus.Refunded
                default: return LockStatus.Empty
            }
        }
        return LockStatus.Empty
    }
}
