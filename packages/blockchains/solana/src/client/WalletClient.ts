import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import type {
    IHTLCWalletClient,
    UserLockParams,
    RefundParams,
    RedeemSolverParams,
    AtomicResult,
} from '@train-protocol/sdk'
import type { SolanaHTLCWalletClientConfig, SolanaSigner } from '../types.js'
import { buildProgram as buildProgramHelper } from './helpers.js'
import { SolanaHTLCPublicClient } from './PublicClient.js'
import { userLock as userLockFn } from './wallet/userLock.js'
import { refund as refundFn } from './wallet/refund.js'
import { redeemSolver as redeemSolverFn } from './wallet/redeemSolver.js'
import { buildUserLockTx as buildUserLockTxFn } from './wallet/buildUserLockTx.js'
import { buildRefundTx as buildRefundTxFn } from './wallet/buildRefundTx.js'
import { buildRedeemSolverTx as buildRedeemSolverTxFn } from './wallet/buildRedeemSolverTx.js'

export class SolanaHTLCWalletClient extends SolanaHTLCPublicClient implements IHTLCWalletClient {
    private signer: SolanaSigner

    constructor(config: SolanaHTLCWalletClientConfig) {
        super(config)
        this.signer = config.signer
    }

    protected override buildProgram(contractAddress: string, readerKey?: PublicKey, connection?: Connection): Program {
        return buildProgramHelper(contractAddress, connection ?? this.connection, readerKey ?? new PublicKey(this.signer.publicKey))
    }

    // ── Write Operations ───────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        const walletPublicKey = new PublicKey(this.signer.publicKey)
        const program = this.buildProgram(params.atomicContract, walletPublicKey)
        return userLockFn(this.connection, this.signer, params, program)
    }

    async refund(params: RefundParams): Promise<string> {
        const walletPublicKey = new PublicKey(this.signer.publicKey)
        const program = this.buildProgram(params.contractAddress, walletPublicKey)
        return refundFn(this.connection, this.signer, params, program)
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        const walletPublicKey = new PublicKey(this.signer.publicKey)
        const program = this.buildProgram(params.contractAddress, walletPublicKey)
        return redeemSolverFn(this.connection, this.signer, params, program)
    }

    // ── Transaction Builders ──────────────────────────────────────────
    // Return unsigned, blockhash-attached `Transaction` objects ready to
    // sign/send. Useful for integrators who want to sign/submit via their
    // own infrastructure.

    async buildUserLockTx(params: UserLockParams): Promise<Transaction> {
        const walletPublicKey = new PublicKey(this.signer.publicKey)
        const program = this.buildProgram(params.atomicContract, walletPublicKey)
        return buildUserLockTxFn(this.connection, program, walletPublicKey, params)
    }

    async buildRefundTx(params: RefundParams): Promise<Transaction> {
        const walletPublicKey = new PublicKey(this.signer.publicKey)
        const program = this.buildProgram(params.contractAddress, walletPublicKey)
        return buildRefundTxFn(this.connection, program, walletPublicKey, params)
    }

    async buildRedeemSolverTx(params: RedeemSolverParams): Promise<Transaction> {
        const walletPublicKey = new PublicKey(this.signer.publicKey)
        const program = this.buildProgram(params.contractAddress, walletPublicKey)
        return buildRedeemSolverTxFn(this.connection, program, walletPublicKey, params)
    }
}
