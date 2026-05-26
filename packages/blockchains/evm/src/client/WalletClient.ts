import type {
    IHTLCWalletClient,
    UserLockParams,
    RefundParams,
    RedeemSolverParams,
    AtomicResult,
} from '@train-protocol/sdk'
import type { EvmHTLCWalletClientConfig, EvmSigner, EvmTransactionRequest } from '../types.js'
import { EvmHTLCPublicClient } from './PublicClient.js'
import { userLock } from './wallet/userLock.js'
import { refund } from './wallet/refund.js'
import { redeemSolver } from './wallet/redeemSolver.js'
import { buildUserLockTx } from './wallet/buildUserLockTx.js'
import { buildRefundTx } from './wallet/buildRefundTx.js'
import { buildRedeemSolverTx } from './wallet/buildRedeemSolverTx.js'
import { buildApproveTx, type BuildApproveTxParams } from './wallet/buildApproveTx.js'

export class EvmHTLCWalletClient extends EvmHTLCPublicClient implements IHTLCWalletClient {
    private signer: EvmSigner

    constructor(config: EvmHTLCWalletClientConfig) {
        super(config)
        this.signer = config.signer
    }

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        return userLock(this.rpc, this.signer, params)
    }

    async refund(params: RefundParams): Promise<string> {
        return refund(this.rpc, this.signer, params)
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        return redeemSolver(this.rpc, this.signer, params)
    }

    // ── Transaction Builders ──────────────────────────────────────────
    // Pure calldata + tx-request constructors. No RPC, no signer.
    // Useful for integrators who want to sign/submit via their own infra
    // (Safe SDK, smart accounts, custom relayers, batched txs).

    buildUserLockTx(params: UserLockParams): EvmTransactionRequest {
        return buildUserLockTx(params)
    }

    buildRefundTx(params: RefundParams): EvmTransactionRequest {
        return buildRefundTx(params)
    }

    buildRedeemSolverTx(params: RedeemSolverParams): EvmTransactionRequest {
        return buildRedeemSolverTx(params)
    }

    buildApproveTx(params: BuildApproveTxParams): EvmTransactionRequest {
        return buildApproveTx(params)
    }
}
