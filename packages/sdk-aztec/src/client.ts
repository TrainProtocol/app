import { AztecAddress } from '@aztec/aztec.js/addresses'
import { SetPublicAuthwitContractInteraction } from '@aztec/aztec.js/authorization'
import { BatchCall, getContractInstanceFromInstantiationParams } from '@aztec/aztec.js/contracts'
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee'
import { Fr } from '@aztec/aztec.js/fields'
import { type AztecNode, createAztecNodeClient } from '@aztec/aztec.js/node'
import type { Wallet } from '@aztec/aztec.js/wallet'
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC'
import {
    type CreateHTLCParams,
    type LockParams,
    type RefundParams,
    type ClaimParams,
    type LockDetails,
    type AtomicResult,
    type RecoveredSwapData,
    type LockStatus,
    HTLCClient,
} from '@train-protocol/sdk'
import { TokenContract } from './artifacts/Token'
import { TrainContract } from './artifacts/Train'
import type { AztecHTLCClientConfig, AztecSigner } from './types'
import { bytesToHex, hexToBytes, parseUnits, formatUnits } from '@train-protocol/sdk'
import { stringToBytes } from './utils'

const TX_TIMEOUT = 120000
const AZTEC_TOKEN_DECIMALS = 18

export class AztecHTLCClient extends HTLCClient {
    private readonly rpcUrl: string
    private readonly signer?: AztecSigner
    private _node?: AztecNode
    private _sponsoredFPCInstance?: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>>

    constructor(config: AztecHTLCClientConfig) {
        super(config.apiClient)
        this.rpcUrl = config.rpcUrl
        this.signer = config.signer
    }

    async createHTLC(params: CreateHTLCParams): Promise<AtomicResult> {
        try {
            const signer = this.requireSigner()
            const feeOptions = await this.createFeeOptions()

            const accounts = await signer.wallet.getAccounts()
            const senderAddress = accounts[0].item

            const trainAddress = AztecAddress.fromString(params.atomicContract)
            const tokenAddress = AztecAddress.fromString(params.tokenContractAddress!)

            const node = this.getNode()

            // Register Train contract
            const trainInstance = await node.getContract(trainAddress)
            if (!trainInstance) throw new Error('Train contract not found')
            await signer.wallet.registerContract(trainInstance, TrainContract.artifact)
            const train = TrainContract.at(trainAddress, signer.wallet)

            // Register Token contract (instance only)
            const tokenInstance = await node.getContract(tokenAddress)
            if (!tokenInstance) {
                throw new Error(
                    `Token contract not found at ${tokenAddress.toString()} on node ${this.rpcUrl}`,
                )
            }
            await signer.wallet.registerContract(tokenInstance)
            const token = TokenContract.at(tokenAddress, signer.wallet)

            const amount = parseUnits(params.amount.toString(), params.decimals)

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

            // Get current block timestamp for quote expiry
            const latestHeader = await node.getBlockHeader('latest')
            const now = latestHeader ? Number(latestHeader.globalVariables.timestamp) : Math.floor(Date.now() / 1000)
            const effectiveQuoteExpiry = params.quoteExpiry ?? (now + 300)

            // Prepare byte arrays
            const hashlockBytes = hexToBytes(params.hashlock, 32)
            const srcChainBytes = stringToBytes(params.sourceChain, 30)
            const dstChainBytes = stringToBytes(params.destinationChain, 30)
            const dstAddressBytes = stringToBytes(params.destinationAddress, 90)
            const dstTokenBytes = stringToBytes(params.destinationAsset, 90)
            const rewardRecipientBytes = stringToBytes(params.rewardRecipient || '', 90)
            const rewardTokenAddress = stringToBytes(params.rewardToken || '', 90)
            const recipientAddress = AztecAddress.fromString(params.srcLpAddress)

            // Encode nonce/timestamp into userData (first 32 bytes, rest zeros)
            const userData = new Array(256).fill(0)
            if (params.nonce) {
                const nonceHex = params.nonce.toString(16).padStart(64, '0')
                for (let i = 0; i < 32; i++) {
                    userData[i] = parseInt(nonceHex.substring(i * 2, i * 2 + 2), 16)
                }
            }

            const solverDataBytes = new Array(256).fill(0)
            if (params.solverData) {
                const sdClean = params.solverData.replace(/^0x/i, '')
                if (/^[0-9a-fA-F]*$/.test(sdClean)) {
                    for (let i = 0; i < Math.min(sdClean.length / 2, 256); i++) {
                        solverDataBytes[i] = parseInt(sdClean.substring(i * 2, i * 2 + 2), 16)
                    }
                }
            }

            const rewardAmount = params.rewardAmount ? BigInt(params.rewardAmount) : 0n

            // Batch authwit + user_lock into a single transaction (one wallet confirmation)
            const userLockInteraction = train.methods.user_lock(
                hashlockBytes,
                amount,
                transferNonce,
                rewardAmount,
                params.timelockDelta ?? 40,
                params.rewardTimelockDelta ?? 0,
                effectiveQuoteExpiry,
                senderAddress,
                recipientAddress,
                tokenAddress,
                rewardTokenAddress,
                rewardRecipientBytes,
                srcChainBytes,
                dstChainBytes,
                dstAddressBytes,
                BigInt(params.destinationAmount || '0'),
                dstTokenBytes,
                userData,
                solverDataBytes,
            )

            await this.registerSponsoredFPC(signer.wallet)

            const batch = new BatchCall(signer.wallet, [setPublicAuthwit, userLockInteraction])
            const tx = await batch.send({
                from: senderAddress,
                fee: feeOptions,
                wait: { timeout: TX_TIMEOUT, dontThrowOnRevert: true },
            })

            if (tx.hasExecutionReverted?.()) {
                throw new Error(`user_lock reverted: ${tx.error ?? 'unknown error'}`)
            }

            return {
                hash: tx.txHash?.toString() ?? String(tx),
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
                    wait: { timeout: TX_TIMEOUT, dontThrowOnRevert: true },
                })

            if (tx.hasExecutionReverted?.()) {
                throw new Error(`refund_user reverted: ${tx.error ?? 'unknown error'}`)
            }

            return tx.txHash?.toString() ?? String(tx)
        } catch (error) {
            console.error('Error in refund:', error)
            throw error
        }
    }

    async claim(params: ClaimParams): Promise<string> {
        try {
            const signer = this.requireSigner()
            const feeOptions = await this.createFeeOptions()

            const { contract, node } = await this.getContractInstance(params.contractAddress, signer)
            const accounts = await signer.wallet.getAccounts()
            const senderAddress = accounts[0].item

            // Register Token contract if provided (needed for redeem)
            if (params.destinationAsset?.contractAddress) {
                const tokenAddress = AztecAddress.fromString(params.destinationAsset.contractAddress)
                const tokenInstance = await node.getContract(tokenAddress)
                if (!tokenInstance) {
                    throw new Error(
                        `Token contract not found at ${tokenAddress.toString()} on node ${this.rpcUrl}`,
                    )
                }
                await signer.wallet.registerContract(tokenInstance)
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
                    wait: { timeout: TX_TIMEOUT, dontThrowOnRevert: true },
                })

            if (tx.hasExecutionReverted?.()) {
                throw new Error(`redeem_solver reverted: ${tx.error ?? 'unknown error'}`)
            }

            return tx.txHash?.toString() ?? String(tx)
        } catch (error) {
            console.error('Error in claim:', error)
            throw error
        }
    }

    async getUserLockDetails(params: LockParams): Promise<LockDetails | null> {
        const signer = this.requireSigner()
        const { id, contractAddress } = params
        const { contract, userAztecAddress } = await this.getContractInstance(contractAddress, signer)

        const hashlockBytes = hexToBytes(id, 32)
        const result: any = await contract.methods
            .get_user_lock(hashlockBytes)
            .simulate({ from: userAztecAddress })

        const status = Number(result.status) as LockStatus
        if (status === 0) return null

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals ?? AZTEC_TOKEN_DECIMALS)),
            sender: result.sender?.toString(),
            recipient: result.recipient?.toString(),
            token: result.token?.toString(),
            timelock: Number(result.timelock),
            secret: this.parseSecret(result.secret),
            status,
        }
    }

    async _getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<LockDetails | null> {
        const signer = this.requireSigner()
        const { id, contractAddress } = params
        const { contract, userAztecAddress } = await this.getContractInstance(contractAddress, signer, nodeUrl)

        const hashlockBytes = hexToBytes(id, 32)

        const count = await contract.methods
            .get_solver_lock_count(hashlockBytes)
            .simulate({ from: userAztecAddress })

        if (Number(count) === 0) return null

        const result: any = await contract.methods
            .get_solver_lock(hashlockBytes, BigInt(1))
            .simulate({ from: userAztecAddress })

        const status = Number(result.status) as LockStatus
        if (status === 0) return null

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals ?? AZTEC_TOKEN_DECIMALS)),
            sender: result.sender?.toString(),
            recipient: result.recipient?.toString(),
            token: result.token?.toString(),
            timelock: Number(result.timelock),
            reward: Number(formatUnits(BigInt(result.reward), params.decimals ?? AZTEC_TOKEN_DECIMALS)),
            rewardTimelock: Number(result.reward_timelock),
            rewardRecipient: result.reward_recipient?.toString(),
            rewardToken: result.reward_token?.toString(),
            status,
            secret: this.parseSecret(result.secret),
            index: 0,
        }
    }

    async recoverSwap(_txHash: string): Promise<RecoveredSwapData> {
        throw new Error('recoverSwap is not supported for Aztec')
    }

    private parseSecret(rawSecret: unknown): bigint | undefined {
        const secretBytes: number[] = Array.from((rawSecret as number[]) || [])
        const secretHex = secretBytes.length > 0 ? bytesToHex(secretBytes) : '0x0'
        const secretBigInt = BigInt(secretHex)
        return secretBigInt !== 0n ? secretBigInt : undefined
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

        // Register instance without artifact — the wallet's PXE discovers the
        // contract class from its own node, avoiding version-mismatch issues
        // between the app's @aztec/aztec.js and the wallet extension.
        await signer.wallet.registerContract(trainInstance)
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
        await wallet.registerContract(fpcInstance)
    }
}
