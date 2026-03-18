import { cairo, Contract, hash, num, addAddressPadding, ProviderOrAccount, RpcProvider, type Call } from 'starknet'
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
    HTLCClient,
    parseUnits,
    formatUnits,
} from '@train-protocol/sdk'
import type { StarknetHTLCClientConfig, StarknetSigner } from './types.js'
import htlcAbi from './abis/STARKNET_HTLC.json' with { type: 'json' }
import { ERC20_ABI } from './abis/ERC20.js'
import { ZERO_ADDRESS } from './constants.js'

export class StarknetHTLCClient extends HTLCClient {
    private provider: RpcProvider
    private signer: StarknetSigner | undefined

    constructor(config: StarknetHTLCClientConfig) {
        super()
        this.provider = new RpcProvider({ nodeUrl: config.rpcUrl })
        this.signer = config.signer
    }

    // ── Write Operations ───────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        const signer = this.requireSigner()

        const parsedAmount = parseUnits(params.amount.toString(), params.decimals)
        const tokenAddress = params.tokenContractAddress || params.sourceAsset.contractAddress || ZERO_ADDRESS

        // ERC20 approval
        const erc20 = new Contract({ abi: ERC20_ABI, address: tokenAddress, providerOrAccount: signer.account })
        const approveCall: Call = erc20.populate("approve", [params.atomicContract, cairo.uint256(parsedAmount)])

        // Build user_lock call
        const htlcContract = this.createContract(params.atomicContract, signer.account)
        const userLockCall: Call = htlcContract.populate('user_lock', [
            {
                hashlock: cairo.uint256(BigInt(params.hashlock)),
                amount: cairo.uint256(parsedAmount),
                reward_amount: cairo.uint256(params.rewardAmount ? BigInt(params.rewardAmount) : 0n),
                timelock_delta: params.timelockDelta ?? 150,
                reward_timelock_delta: params.rewardTimelockDelta ?? 0,
                quote_expiry: params.quoteExpiry,
                sender: params.sourceAddress,
                recipient: params.srcLpAddress,
                token: tokenAddress,
                reward_token: params.rewardToken ?? '',
                reward_recipient: params.rewardRecipient ?? '',
                src_chain: params.sourceChain || '',
            },
            {
                dst_chain: params.destinationChain,
                dst_address: params.destinationAddress,
                dst_amount: cairo.uint256(BigInt(params.destinationAmount)),
                dst_token: params.destinationAsset,
            },
            String(params.nonce),  // userData — nonce timestamp for recovery
            params.solverData || '',
        ])

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
        const { id, contractAddress } = params
        const contract = this.createContract(contractAddress, this.provider)

        try {
            const result = await contract.get_user_lock(cairo.uint256(BigInt(id)))

            const sender = '0x' + BigInt(result.sender).toString(16)
            if (sender === ZERO_ADDRESS || BigInt(result.sender) === 0n) {
                return null
            }

            const status = this.mapLockStatus(result.status)
            return {
                hashlock: id,
                amount: Number(formatUnits(BigInt(result.amount), params.decimals ?? 18)),
                secret: BigInt(result.secret) !== 0n ? BigInt(result.secret) : undefined,
                sender,
                recipient: BigInt(result.recipient) !== 0n ? '0x' + BigInt(result.recipient).toString(16) : undefined,
                token: BigInt(result.token) !== 0n ? '0x' + BigInt(result.token).toString(16) : undefined,
                timelock: Number(result.timelock),
                status,
            }
        } catch (error) {
            console.error('Error in getUserLockDetails:', error)
            return null
        }
    }

    async getSolverLockCount(params: LockParams, nodeUrl: string): Promise<number> {
        const { id, contractAddress } = params
        const provider = new RpcProvider({ nodeUrl })
        const contract = this.createContract(contractAddress, provider)

        return Number(await contract.get_solver_lock_count(cairo.uint256(BigInt(id))))
    }

    async getSolverLockByIndex(params: LockParams, index: number, nodeUrl: string): Promise<SolverLockDetails | null> {
        const { id, contractAddress } = params
        const provider = new RpcProvider({ nodeUrl })
        const contract = this.createContract(contractAddress, provider)

        const result = await contract.get_solver_lock(cairo.uint256(BigInt(id)), cairo.uint256(BigInt(index)))

        const sender = '0x' + BigInt(result.sender).toString(16)
        if (BigInt(result.sender) === 0n) return null

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals ?? 18)),
            secret: BigInt(result.secret) !== 0n ? BigInt(result.secret) : undefined,
            sender,
            recipient: BigInt(result.recipient) !== 0n ? '0x' + BigInt(result.recipient).toString(16) : undefined,
            token: BigInt(result.token) !== 0n ? '0x' + BigInt(result.token).toString(16) : undefined,
            timelock: Number(result.timelock),
            reward: Number(formatUnits(BigInt(result.reward), params.decimals ?? 18)),
            rewardTimelock: Number(result.reward_timelock),
            rewardRecipient: BigInt(result.reward_recipient) !== 0n ? '0x' + BigInt(result.reward_recipient).toString(16) : undefined,
            rewardToken: BigInt(result.reward_token) !== 0n ? '0x' + BigInt(result.reward_token).toString(16) : undefined,
            status: this.mapLockStatus(result.status),
            index,
        }
    }

    async recoverSwap(txHash: string): Promise<RecoveredSwapData> {
        if (!/^0x[a-fA-F0-9]{1,64}$/.test(txHash))
            throw new Error('Invalid transaction hash format')

        const receipt = await this.provider.getTransactionReceipt(txHash)
        if (!receipt || !('events' in receipt)) throw new Error('Transaction not found')

        const userLockedSelector = hash.getSelectorFromName('UserLocked')
        const rawEvent = receipt.events.find(e => e.keys.includes(userLockedSelector))
        if (!rawEvent) throw new Error('This transaction does not contain a swap lock')

        const srcContract = rawEvent.from_address

        const contract = this.createContract(srcContract, this.provider)
        const parsed = contract.parseEvents(receipt)

        const userLockedEntry = parsed.find(
            ev => Object.keys(ev).some(k => k.includes('UserLocked'))
        )
        if (!userLockedEntry) throw new Error('Failed to decode UserLocked event')

        const eventKey = Object.keys(userLockedEntry).find(k => k.includes('UserLocked'))!
        const event = userLockedEntry[eventKey] as Record<string, any>

        const rawDstToken = event.dst_token as string
        const dstToken = !rawDstToken || /^[\u0000]+$/.test(rawDstToken) ? '0x0000000000000000000000000000000000000000' : rawDstToken

        return {
            hashlock: addAddressPadding(num.toHex(event.hashlock)),
            sender: addAddressPadding(num.toHex(event.sender)),
            recipient: addAddressPadding(num.toHex(event.recipient)),
            srcChain: event.src_chain as string,
            dstChain: event.dst_chain as string,
            token: addAddressPadding(num.toHex(event.token)),
            amount: BigInt(event.amount),
            dstAddress: event.dst_address as string,
            dstAmount: BigInt(event.dst_amount),
            dstToken,
            srcContract,
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
