import { EventSelector, decodeFromAbi } from '@aztec/aztec.js/abi'
import { AztecAddress } from '@aztec/aztec.js/addresses'
import { SetPublicAuthwitContractInteraction } from '@aztec/aztec.js/authorization'
import { BatchCall, getContractInstanceFromInstantiationParams } from '@aztec/aztec.js/contracts'
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee'
import { Fr } from '@aztec/aztec.js/fields'
import { type AztecNode, createAztecNodeClient } from '@aztec/aztec.js/node'
import { TxHash } from '@aztec/aztec.js/tx'
import type { Wallet } from '@aztec/aztec.js/wallet'
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC'
import {
    type UserLockParams,
    type LockParams,
    type RefundParams,
    type RedeemSolverParams,
    type AtomicResult,
    type UserLockDetails,
    type SolverLockDetails,
    type BaseLockDetails,
    type LockStatus,
    type EventDerivedData,
    type Network,
    type TransactionInfo,
    TransactionStatus,
    HTLCClient,
} from '@train-protocol/sdk'
import { TokenContract } from './artifacts/Token'
import { TrainContract } from './artifacts/Train'
import type { AztecHTLCClientConfig, AztecSigner } from './types'
import { bytesToHex, hexToBytes, parseUnits, formatUnits } from '@train-protocol/sdk'

export class AztecHTLCClient extends HTLCClient {
    private readonly rpcUrl: string
    private readonly signer?: AztecSigner
    private _node?: AztecNode
    private _sponsoredFPCInstance?: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>>
    TX_TIMEOUT = 120000

    constructor(config: AztecHTLCClientConfig) {
        super()
        this.rpcUrl = config.rpcUrl
        this.signer = config.signer
        this.consensusOptions = { minQuorum: 1, batchSize: 1 }
    }

    // ── Write Operations ───────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        try {
            const signer = this.requireSigner()
            const feeOptions = await this.createFeeOptions()

            const accounts = await signer.wallet.getAccounts()
            const senderAddress = accounts[0].item

            const trainAddress = AztecAddress.fromString(params.atomicContract)
            const tokenAddress = AztecAddress.fromString(params.sourceAsset.contract!)

            const node = this.getNode()

            // Register Train contract
            const trainInstance = await node.getContract(trainAddress)
            if (!trainInstance) throw new Error('Train contract not found')
            await signer.wallet.registerContract(trainInstance, TrainContract.artifact)
            const train = TrainContract.at(trainAddress, signer.wallet)

            // Register Token contract
            const tokenInstance = await node.getContract(tokenAddress)
            if (!tokenInstance) {
                throw new Error(
                    `Token contract not found at ${tokenAddress.toString()} on node ${this.rpcUrl}`,
                )
            }
            await signer.wallet.registerContract(tokenInstance, TokenContract.artifact)
            const token = TokenContract.at(tokenAddress, signer.wallet)

            const amount = parseUnits(params.amount.toString(), params.sourceAsset.decimals)

            // Authorize public token transfer
            const transferNonce = Fr.random()
            const publicAction = token.methods.transfer_public_to_public(
                senderAddress,
                trainAddress,
                amount,
                transferNonce,
            )

            const setPublicAuthwit = await SetPublicAuthwitContractInteraction.create(
                signer.wallet,
                senderAddress,
                { caller: trainAddress, action: publicAction },
                true,
            )

            // Batch authwit + user_lock into a single transaction (one wallet confirmation)
            const userLockInteraction = train.methods.user_lock(
                hexToBytes(params.hashlock, 32),
                amount,
                transferNonce,
                params.rewardAmount ? BigInt(params.rewardAmount) : 0n,
                params.timelockDelta ?? 40,
                params.rewardTimelockDelta ?? 0,
                params.quoteExpiry,
                senderAddress,
                AztecAddress.fromString(params.srcSolverAddress),
                tokenAddress,
                this.strToBytes(params.rewardToken || '', 90), // [u8;90] in user_lock
                this.strToBytes(params.rewardRecipient || '', 90), // [u8;90] in user_lock
                this.strToBytes(params.sourceChain, 30),
                this.strToBytes(params.destinationChain, 30),
                this.strToBytes(params.destinationAddress, 90),
                BigInt(params.destinationAmount),
                this.strToBytes(params.destinationAsset.contract, 90),
                this.strToBytes(params.nonce.toString() ?? '', 256),
                this.strToBytes(params.solverData ?? '', 256),
            )

            await this.registerSponsoredFPC(signer.wallet)

            const batch = new BatchCall(signer.wallet, [setPublicAuthwit, userLockInteraction])
            const tx = await batch.send({
                from: senderAddress,
                fee: feeOptions,
                wait: { timeout: this.TX_TIMEOUT, dontThrowOnRevert: true },
            })

            if (tx.receipt.hasExecutionReverted()) {
                throw new Error(`user_lock reverted: ${tx.receipt.error ?? 'unknown error'}`)
            }

            return {
                hash: tx.receipt.txHash?.toString() ?? String(tx),
                hashlock: params.hashlock,
                nonce: params.nonce,
            }
        } catch (error) {
            console.error('Error in createHTLC:', error)
            throw error
        }
    }

    async refund(params: RefundParams): Promise<string> {
        try {
            const signer = this.requireSigner()
            const feeOptions = await this.createFeeOptions()

            const { contract } = await this.getContractInstance(params.contractAddress, signer)
            const accounts = await signer.wallet.getAccounts()
            const senderAddress = accounts[0].item

            await this.registerSponsoredFPC(signer.wallet)

            const hashlockBytes = hexToBytes(params.id, 32)

            const tx = await contract.methods
                .refund_user(hashlockBytes)
                .send({
                    from: senderAddress,
                    fee: feeOptions,
                    wait: { timeout: this.TX_TIMEOUT, dontThrowOnRevert: true },
                })

            if (tx.receipt.hasExecutionReverted()) {
                throw new Error(`refund_user reverted: ${tx.receipt.error ?? 'unknown error'}`)
            }

            return tx.receipt.txHash?.toString() ?? String(tx)
        } catch (error) {
            console.error('Error in refund:', error)
            throw error
        }
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        try {
            const signer = this.requireSigner()
            const feeOptions = await this.createFeeOptions()

            const { contract, node } = await this.getContractInstance(params.contractAddress, signer)
            const accounts = await signer.wallet.getAccounts()
            const senderAddress = accounts[0].item

            // Register Token contract if provided (needed for redeem)
            if (params.destinationAsset?.contract) {
                const tokenAddress = AztecAddress.fromString(params.destinationAsset.contract)
                const tokenInstance = await node.getContract(tokenAddress)
                if (!tokenInstance) {
                    throw new Error(
                        `Token contract not found at ${tokenAddress.toString()} on node ${this.rpcUrl}`,
                    )
                }
                await signer.wallet.registerContract(tokenInstance, TokenContract.artifact)
                await signer.wallet.registerSender(AztecAddress.fromString(params.contractAddress))
            }

            await this.registerSponsoredFPC(signer.wallet)

            const hashlockBytes = hexToBytes(params.id, 32)

            const secretHex = typeof params.secret === 'bigint'
                ? '0x' + params.secret.toString(16).padStart(64, '0')
                : String(params.secret)
            const secretBytes = hexToBytes(secretHex, 32)

            const tx = await contract.methods
                .redeem_solver(hashlockBytes, BigInt(params.index ?? 1), secretBytes)
                .send({
                    from: senderAddress,
                    fee: feeOptions,
                    wait: { timeout: this.TX_TIMEOUT, dontThrowOnRevert: true },
                })

            if (tx.receipt.hasExecutionReverted()) {
                throw new Error(`redeem_solver reverted: ${tx.receipt.error ?? 'unknown error'}`)
            }

            return tx.receipt.txHash?.toString() ?? String(tx)
        } catch (error) {
            console.error('Error in redeemSolver:', error)
            throw error
        }
    }

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        const signer = this.requireSigner()
        const { id, contractAddress, txId } = params
        const { contract, userAztecAddress } = await this.getContractInstance(contractAddress, signer)

        const hashlockBytes = hexToBytes(id, 32)
        const result: any = await contract.methods
            .get_user_lock(hashlockBytes)
            .simulate({ from: userAztecAddress })

        const status = Number(result.status) as LockStatus
        if (status === 0) return null

        const parsedResult: BaseLockDetails = {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
            secret: this.parseSecret(result.secret),
            timelock: Number(result.timelock),
            status,
            sender: result.sender?.toString() ?? '',
            recipient: result.recipient?.toString() ?? '',
            token: result.token?.toString() ?? '',
        }

        let eventDerivedData = {} as Partial<EventDerivedData>
        if (txId) {
            eventDerivedData = await this.findEventDataFromLogs(txId, id)
        }

        return { ...parsedResult, ...eventDerivedData }
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        const signer = this.requireSigner()
        const { id, contractAddress } = params
        const { contract, userAztecAddress } = await this.getContractInstance(contractAddress, signer, nodeUrl)

        const hashlockBytes = hexToBytes(id, 32)

        const count = Number(await contract.methods
            .get_solver_lock_count(hashlockBytes)
            .simulate({ from: userAztecAddress }))
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
        const signer = this.requireSigner()
        const { id, contractAddress } = params
        const { contract, userAztecAddress } = await this.getContractInstance(contractAddress, signer, nodeUrl)

        const hashlockBytes = hexToBytes(id, 32)

        const result: any = await contract.methods
            .get_solver_lock(hashlockBytes, BigInt(index))
            .simulate({ from: userAztecAddress })

        const status = Number(result.status) as LockStatus
        if (status === 0) return null

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
            secret: this.parseSecret(result.secret),
            timelock: Number(result.timelock),
            status,
            sender: result.sender?.toString() ?? '',
            recipient: result.recipient?.toString() ?? '',
            token: result.token?.toString() ?? '',
            reward: Number(formatUnits(BigInt(result.reward), params.decimals)),
            rewardTimelock: Number(result.reward_timelock),
            rewardRecipient: result.reward_recipient?.toString() ?? '',
            rewardToken: result.reward_token?.toString() ?? '',
            index,
        }
    }

    async recoverSwap(txHash: string, network: Network): Promise<UserLockDetails> {
        if (!/^0x[a-fA-F0-9]{1,64}$/.test(txHash))
            throw new Error('Invalid transaction hash format')

        const node = this.getNode()
        const { logs } = await node.getPublicLogs({
            txHash: TxHash.fromString(txHash),
        })

        if (!logs.length) throw new Error('Transaction not found')

        const eventDef = TrainContract.events.UserLocked

        for (const log of logs) {
            const emittedFields = log.log.getEmittedFields()
            if (emittedFields.length === 0) continue

            const selectorField = emittedFields[emittedFields.length - 1]
            const selector = EventSelector.fromField(selectorField)
            if (selector.toString() !== eventDef.eventSelector.toString()) continue

            const decoded = decodeFromAbi(
                [eventDef.abiType],
                log.log.fields,
            ) as Record<string, any>

            const eventHashlock = bytesToHex(Array.from(decoded.hashlock).map(Number))
            const eventToken = decoded.token.toString()

            const token = network.tokens.find(t => t.contract?.toLowerCase() === eventToken.toLowerCase())
            const decimals = token?.decimals ?? 18

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

        throw new Error('This transaction does not contain a swap lock')
    }

    // ── Public Helpers ─────────────────────────────────────────────────

    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        try {
            const node = this.getNode()
            const receipt = await node.getTxReceipt(TxHash.fromString(txHash))

            if (!receipt) return null

            let status: TransactionStatus
            if (receipt.isDropped() || receipt.hasExecutionReverted()) {
                status = TransactionStatus.Failed
            } else if (receipt.isMined()) {
                status = TransactionStatus.Confirmed
            } else {
                status = TransactionStatus.Pending
            }

            return {
                hash: txHash,
                status,
                blockNumber: receipt.blockNumber != null
                    ? String(receipt.blockNumber)
                    : undefined,
            }
        } catch {
            return null
        }
    }

    // ── Private Helpers ────────────────────────────────────────────────

    private parseSecret(rawSecret: unknown): bigint {
        const secretBytes: number[] = Array.from((rawSecret as number[]) || [])
        const secretHex = secretBytes.length > 0 ? bytesToHex(secretBytes) : '0x0'
        return BigInt(secretHex)
    }

    private requireSigner(): AztecSigner {
        if (!this.signer) throw new Error('Signer required')
        return this.signer
    }

    private getNode(): AztecNode {
        if (!this._node) {
            this._node = createAztecNodeClient(this.rpcUrl)
        }
        return this._node
    }

    private async getContractInstance(contractAddress: string, signer: AztecSigner, nodeUrl?: string) {
        const aztecAtomicContract = AztecAddress.fromString(contractAddress)
        const node = nodeUrl ? createAztecNodeClient(nodeUrl) : this.getNode()
        const trainInstance = await node.getContract(aztecAtomicContract)

        if (!trainInstance) throw new Error('Train contract not found')

        await signer.wallet.registerContract(trainInstance, TrainContract.artifact)
        const contract = TrainContract.at(aztecAtomicContract, signer.wallet)
        const userAztecAddress = AztecAddress.fromString(signer.address)

        return { contract, userAztecAddress, node }
    }

    private async getSponsoredFPCInstance() {
        if (!this._sponsoredFPCInstance) {
            this._sponsoredFPCInstance = await getContractInstanceFromInstantiationParams(
                SponsoredFPCContract.artifact,
                { salt: new Fr(0) },
            )
        }
        return this._sponsoredFPCInstance
    }

    private async createFeeOptions() {
        const fpcInstance = await this.getSponsoredFPCInstance()
        return {
            paymentMethod: new SponsoredFeePaymentMethod(fpcInstance.address),
        }
    }

    private async registerSponsoredFPC(wallet: Wallet): Promise<void> {
        const fpcInstance = await this.getSponsoredFPCInstance()
        await wallet.registerContract(fpcInstance, SponsoredFPCContract.artifact)
    }

    private async findEventDataFromLogs(txHash: string, hashlock: string): Promise<Partial<EventDerivedData>> {
        try {
            const node = this.getNode()
            const { logs } = await node.getPublicLogs({
                txHash: TxHash.fromString(txHash),
            })

            const eventDef = TrainContract.events.UserLocked

            const aztecBytesToString = (bytes: (bigint | number)[]) =>
                new TextDecoder().decode(new Uint8Array(bytes.map(Number))).replace(/\0/g, '').trim()

            for (const log of logs) {
                const emittedFields = log.log.getEmittedFields()
                if (emittedFields.length === 0) continue

                const selectorField = emittedFields[emittedFields.length - 1]
                const selector = EventSelector.fromField(selectorField)
                if (selector.toString() !== eventDef.eventSelector.toString()) continue

                const decoded = decodeFromAbi(
                    [eventDef.abiType],
                    log.log.fields,
                ) as Record<string, any>

                const decodedHashlock = bytesToHex(Array.from(decoded.hashlock).map(Number))
                if (decodedHashlock.toLowerCase() !== hashlock.toLowerCase()) continue

                const data: Partial<EventDerivedData> = {}

                if (decoded.dst_chain) data.dstChain = aztecBytesToString(decoded.dst_chain)
                if (decoded.dst_address) data.dstAddress = aztecBytesToString(decoded.dst_address)
                if (decoded.dst_amount != null) data.dstAmount = BigInt(decoded.dst_amount)
                if (decoded.dst_token) data.dstToken = aztecBytesToString(decoded.dst_token)
                if (decoded.userData) {
                    data.userData = aztecBytesToString(decoded.userData) || undefined
                }
                if (decoded.solverData) {
                    data.solverData = aztecBytesToString(decoded.solverData) || undefined
                }

                return data
            }
        } catch (e) {
            console.error('Error fetching event data from Aztec logs:', e)
        }
        return {}
    }

    private strToBytes(str: string, length: number): number[] {
        const bytes = new TextEncoder().encode(str);
        const result = new Array<number>(length).fill(0);
        for (let i = 0; i < Math.min(bytes.length, length); i++) {
            result[i] = bytes[i];
        }
        return result;
    }
}