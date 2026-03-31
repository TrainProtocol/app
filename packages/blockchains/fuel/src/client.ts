import { Provider, Contract, Address, DateTime } from 'fuels'
import {
    UserLockParams,
    LockParams,
    RefundParams,
    RedeemSolverParams,
    LockDetails,
    AtomicResult,
    RecoveredSwapData,
    TransactionInfo,
    TransactionStatus,
    HTLCClient,
    parseUnits,
    toHex32,
} from '@train-protocol/sdk'
import type { FuelHTLCClientConfig, FuelSigner } from './types.js'
import { resolveLock, ZERO_B256 } from './resolveLock.js'

// TODO: Replace with actual HTLC contract ABI when available
// The ABI should define: userLock, refundUser, redeemSolver,
// getUserLock, getSolverLock, getSolverLockCount
const HTLC_ABI: any = null

export class FuelHTLCClient extends HTLCClient {
    private rpcUrl: string
    private signer: FuelSigner | undefined

    constructor(config: FuelHTLCClientConfig) {
        super(config.apiClient)
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
        const isNativeToken = !sourceAsset.contractAddress

        try {
            const provider = new Provider(this.rpcUrl)
            const contract = new Contract(atomicContract, HTLC_ABI, signer.account)

            // Resolve asset ID: native → base asset, token → derived from contract address
            const assetId = isNativeToken
                ? await provider.getBaseAssetId()
                : Address.fromAddressOrString(sourceAsset.contractAddress!).toAssetId().bits

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

    async getUserLockDetails(params: LockParams): Promise<LockDetails | null> {
        const { id, trainContractAddress, txId } = params

        try {
            const provider = new Provider(this.rpcUrl)
            const contract = new Contract(trainContractAddress, HTLC_ABI, provider)

            // TODO: Update function name when contract ABI is finalized
            const { value: details } = await contract.functions.get_user_lock(id).get()

            if (!details) return null

            const lock = resolveLock(details, id, params.tokenDecimals)
            if (!lock) return null

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

            return { ...lock, userData }
        } catch (error) {
            console.error('Error in getUserLockDetails:', error)
            return null
        }
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<LockDetails | null> {
        const { id, trainContractAddress } = params

        try {
            const provider = new Provider(nodeUrl)
            const contract = new Contract(trainContractAddress, HTLC_ABI, provider)

            // Step 1: Get solver lock count for this hashlock
            // TODO: Update function name when contract ABI is finalized
            const { value: count } = await contract.functions
                .get_solver_lock_count(id)
                .get()

            if (!count || Number(count) === 0) return null

            // Step 2: Loop from 1 to count (1-indexed)
            for (let i = 1; i <= Number(count); i++) {
                // TODO: Update function name when contract ABI is finalized
                const { value: result } = await contract.functions
                    .get_solver_lock(id, i)
                    .get()

                if (!result) continue

                const sender = result.sender?.bits ?? null
                if (!sender || sender === ZERO_B256) continue

                // Filter by solver address if provided (case-insensitive)
                if (
                    params.solverAddress &&
                    sender.toLowerCase() !== params.solverAddress.toLowerCase()
                ) {
                    continue
                }

                const solverLock = resolveLock(result, id, params.tokenDecimals, params.rewardTokenDecimals)
                if (!solverLock) continue
                return { ...solverLock, index: i }
            }

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

}
