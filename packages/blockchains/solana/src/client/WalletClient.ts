import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
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

export class SolanaHTLCWalletClient extends SolanaHTLCPublicClient implements IHTLCWalletClient {
    private signer: SolanaSigner

    constructor(config: SolanaHTLCWalletClientConfig) {
        super(config)
        this.signer = config.signer
    }

    // Override buildProgram to use signer's public key
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
}
