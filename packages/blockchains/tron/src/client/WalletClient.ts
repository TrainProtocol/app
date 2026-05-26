import type {
    IHTLCWalletClient,
    UserLockParams,
    RefundParams,
    RedeemSolverParams,
    AtomicResult,
} from '@train-protocol/sdk'
import type { TronHTLCWalletClientConfig, TronSigner, TronTransactionRequest } from '../types.js'
import { TronHTLCPublicClient } from './PublicClient.js'
import { userLock } from './wallet/userLock.js'
import { refund } from './wallet/refund.js'
import { redeemSolver } from './wallet/redeemSolver.js'
import { buildUserLockTx } from './wallet/buildUserLockTx.js'
import { buildRefundTx } from './wallet/buildRefundTx.js'
import { buildRedeemSolverTx } from './wallet/buildRedeemSolverTx.js'
import { buildApproveTx, type BuildApproveTxParams } from './wallet/buildApproveTx.js'

export class TronHTLCWalletClient extends TronHTLCPublicClient implements IHTLCWalletClient {
    private signer: TronSigner

    constructor(config: TronHTLCWalletClientConfig) {
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

    buildUserLockTx(params: UserLockParams): TronTransactionRequest {
        return buildUserLockTx(params)
    }

    buildRefundTx(params: RefundParams): TronTransactionRequest {
        return buildRefundTx(params)
    }

    buildRedeemSolverTx(params: RedeemSolverParams): TronTransactionRequest {
        return buildRedeemSolverTx(params)
    }

    buildApproveTx(params: BuildApproveTxParams): TronTransactionRequest {
        return buildApproveTx(params)
    }
}
