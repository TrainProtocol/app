import type {
    AtomicResult,
    IHTLCWalletClient,
    RedeemSolverParams,
    RefundParams,
    UserLockParams,
} from '@train-protocol/sdk'
import type {
    FuelHTLCWalletClientConfig,
    FuelSigner,
    FuelTransactionRequest,
} from '../types.js'
import { FuelHTLCPublicClient } from './PublicClient.js'
import { buildRedeemSolverTx } from './wallet/buildRedeemSolverTx.js'
import { buildRefundTx } from './wallet/buildRefundTx.js'
import { buildUserLockTx } from './wallet/buildUserLockTx.js'
import { redeemSolver } from './wallet/redeemSolver.js'
import { refund } from './wallet/refund.js'
import { userLock } from './wallet/userLock.js'

export class FuelHTLCWalletClient extends FuelHTLCPublicClient implements IHTLCWalletClient<FuelTransactionRequest> {
    private signer: FuelSigner

    constructor(config: FuelHTLCWalletClientConfig) {
        super(config)
        this.signer = config.signer
    }

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        return userLock(this.signer, params)
    }

    async refund(params: RefundParams): Promise<string> {
        return refund(this.signer, params)
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        return redeemSolver(this.signer, params)
    }

    // ── Transaction Builders ──────────────────────────────────────────

    async buildUserLockTx(params: UserLockParams): Promise<FuelTransactionRequest> {
        return buildUserLockTx(this.signer, params)
    }

    async buildRefundTx(params: RefundParams): Promise<FuelTransactionRequest> {
        return buildRefundTx(this.signer, params)
    }

    async buildRedeemSolverTx(params: RedeemSolverParams): Promise<FuelTransactionRequest> {
        return buildRedeemSolverTx(this.signer, params)
    }
}
