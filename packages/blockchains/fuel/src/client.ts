import { Provider, Contract, Address, DateTime } from 'fuels'
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
    toHex32,
} from '@train-protocol/sdk'
import type { FuelHTLCClientConfig, FuelSigner } from './types.js'

// TODO: Replace with actual HTLC contract ABI when available
// The ABI should define: userLock, refundUser, redeemSolver,
// getUserLock, getSolverLock, getSolverLockCount
const HTLC_ABI: any = null

const ZERO_B256 = '0x' + '0'.repeat(64)
const TX_TIMEOUT = 120_000

export class FuelHTLCClient extends HTLCClient {
    private rpcUrl: string
    private signer: FuelSigner | undefined

    constructor(config: FuelHTLCClientConfig) {
        super()
        this.rpcUrl = config.rpcUrl
        this.signer = config.signer
    }

    // ── Write Operations ───────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        const signer = this.requireSigner()
        const {
            sourceAsset,
            atomicContract,
            hashlock,
            nonce,
            srcLpAddress,
            destinationChain,
            destinationAsset,
            destinationAddress,
            destinationAmount,
            sourceChain,
        } = params

        const parsedAmount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)
        const isNativeToken = !sourceAsset.contract

        try {
            const provider = new Provider(this.rpcUrl)
            const contract = new Contract(atomicContract, HTLC_ABI, signer.account)

            // Resolve asset ID: native → base asset, token → derived from contract address
            const assetId = isNativeToken
                ? await provider.getBaseAssetId()
                : Address.fromAddressOrString(sourceAsset.contract!).toAssetId().bits

            // Encode userData with nonce for recovery
            const userData = toHex32(BigInt(nonce))

            // Compute timelock as TAI64
            const timelockDelta = params.timelockDelta ?? 0
            const timeLockS = Math.floor(Date.now() / 1000) + timelockDelta
            const timelock = DateTime.fromUnixSeconds(timeLockS).toTai64()

            const srcReceiver = { bits: srcLpAddress }

            // TODO: Update function name and params when contract ABI is finalized
            const { transactionId, waitForResult } = await contract.functions
                .user_lock(
                    hashlock,
                    srcReceiver,
                    timelock,
                    userData,
                    params.solverData || '0x',
                    destinationChain,
                    destinationAsset,
                    destinationAddress,
                    destinationAmount,
                    sourceChain || '',
                )
                .callParams({
                    forward: [parsedAmount.toString(), assetId],
                })
                .call()

            await waitForResult()

            return { hash: transactionId, hashlock, nonce }
        } catch (error) {
            console.error('Error in userLock:', error)
            throw error
        }
    }

    async refund(params: RefundParams): Promise<string> {
        const signer = this.requireSigner()
        const { id, contractAddress } = params

        try {
            const contract = new Contract(contractAddress, HTLC_ABI, signer.account)

            // TODO: Update function name when contract ABI is finalized
            const { transactionId, waitForResult } = await contract.functions
                .refund_user(id)
                .call()

            await waitForResult()

            return transactionId
        } catch (error) {
            console.error('Error in refund:', error)
            throw error
        }
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        const signer = this.requireSigner()
        const { id, contractAddress, secret } = params

        try {
            const contract = new Contract(contractAddress, HTLC_ABI, signer.account)

            const secretBigInt = BigInt(secret)
            const index = params.index ?? 1

            // TODO: Update function name when contract ABI is finalized
            const { transactionId, waitForResult } = await contract.functions
                .redeem_solver(id, index, secretBigInt)
                .call()

            await waitForResult()

            return transactionId
        } catch (error) {
            console.error('Error in redeemSolver:', error)
            throw error
        }
    }

    // ── Read Operations ────────────────────────────────────────────────

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        const { id, contractAddress, txId } = params

        try {
            const provider = new Provider(this.rpcUrl)
            const contract = new Contract(contractAddress, HTLC_ABI, provider)

            // TODO: Update function name when contract ABI is finalized
            const { value: details } = await contract.functions.get_user_lock(id).get()

            if (!details) return null

            const sender = details.sender?.bits ?? null
            if (!sender || sender === ZERO_B256) return null

            let userData: string | undefined

            // Extract userData (nonce) from transaction if txId is provided
            if (txId) {
                try {
                    const txResult = await provider.getTransactionResponse(txId)
                    const summary = await txResult.waitForResult()
                    // TODO: Extract userData from transaction logs when ABI is finalized
                    const userLockedLog = summary.logs?.find(
                        (log: any) => log.Id === id || log.hashlock === id,
                    ) as Record<string, any> | undefined
                    if (userLockedLog?.userData) {
                        userData = BigInt(userLockedLog.userData).toString()
                    }
                } catch (e) {
                    console.error('Error fetching userData from tx:', e)
                }
            }

            const timelock = details.timelock
                ? DateTime.fromTai64(details.timelock).toUnixSeconds()
                : 0

            return {
                hashlock: id,
                amount: Number(formatUnits(BigInt(details.amount), params.decimals ?? 9)),
                secret: details.secret && details.secret !== 0n ? BigInt(details.secret) : undefined,
                sender,
                recipient: details.srcReceiver?.bits ?? undefined,
                timelock,
                status: this.mapLockStatus(Number(details.claimed ?? details.status ?? 0)),
                userData,
            }
        } catch (error) {
            console.error('Error in getUserLockDetails:', error)
            return null
        }
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        const { id, contractAddress } = params

        try {
            const provider = new Provider(nodeUrl)
            const contract = new Contract(contractAddress, HTLC_ABI, provider)

            // TODO: Implement count-then-loop pattern with getSolverLockByIndex when contract ABI is finalized
            const { value: count } = await contract.functions
                .get_solver_lock_count(id)
                .get()

            if (!count || Number(count) === 0) return null

            // TODO: Loop through solver locks by index once getSolverLock ABI is available
            return null
        } catch (error) {
            console.error('Error in getSolverLockDetails:', error)
            return null
        }
    }

    async recoverSwap(txHash: string): Promise<RecoveredSwapData> {
        // Fuel transaction hashes are 0x-prefixed 64-char hex
        if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
            throw new Error('Invalid transaction hash format')
        }

        const provider = new Provider(this.rpcUrl)

        const txResponse = await provider.getTransactionResponse(txHash)
        if (!txResponse) throw new Error('Transaction not found')

        const summary = await txResponse.waitForResult()
        if (!summary) throw new Error('Transaction not found')

        // TODO: Parse UserLocked event from transaction logs when ABI is finalized
        // The log structure will depend on the contract's event definitions
        const userLockedLog = summary.logs?.find(
            (log: any) => log.sender && log.dstChain,
        ) as Record<string, any> | undefined

        if (!userLockedLog) {
            throw new Error('This transaction does not contain a swap lock')
        }

        return {
            hashlock: userLockedLog.hashlock ?? userLockedLog.Id?.toString() ?? '',
            sender: userLockedLog.sender?.bits ?? '',
            recipient: userLockedLog.srcReceiver?.bits ?? '',
            srcChain: userLockedLog.srcChain ?? '',
            dstChain: userLockedLog.dstChain ?? '',
            token: userLockedLog.srcAsset ?? '',
            amount: BigInt(userLockedLog.amount ?? 0),
            dstAddress: userLockedLog.dstAddress ?? '',
            dstAmount: BigInt(userLockedLog.dstAmount ?? 0),
            dstToken: userLockedLog.dstAsset ?? '',
            srcContract: '', // Derived from contract context
        }
    }

    // ── Public Helpers ─────────────────────────────────────────────────

    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        try {
            const provider = new Provider(this.rpcUrl)
            const txResponse = await provider.getTransactionResponse(txHash)
            if (!txResponse) return null

            const summary = await txResponse.waitForResult()

            return {
                hash: txHash,
                status: summary.isStatusFailure
                    ? TransactionStatus.Failed
                    : summary.isStatusSuccess
                        ? TransactionStatus.Confirmed
                        : TransactionStatus.Pending,
                blockNumber: summary.blockId ?? undefined,
            }
        } catch {
            return null
        }
    }

    // ── Private Helpers ────────────────────────────────────────────────

    private requireSigner(): FuelSigner {
        if (!this.signer) throw new Error('Signer required')
        return this.signer
    }

    /**
     * Map the contract's lock status number to the LockStatus enum.
     * Old contract uses `claimed` field (u8): 0=Pending, 1=Redeemed, 2=Refunded
     * New contract will use `status` field — mapping may need updating.
     */
    private mapLockStatus(status: number): LockStatus {
        switch (status) {
            case 0: return LockStatus.Pending
            case 1: return LockStatus.Redeemed
            case 2: return LockStatus.Refunded
            default: return LockStatus.Empty
        }
    }
}
