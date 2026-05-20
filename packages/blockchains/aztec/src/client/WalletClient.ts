import type {
    IHTLCWalletClient,
    UserLockParams,
    RefundParams,
    RedeemSolverParams,
    AtomicResult,
} from '@train-protocol/sdk'
import type { AztecHTLCWalletClientConfig, AztecSigner, AztecTransactionRequest } from '../types'
import { AztecHTLCPublicClient } from './PublicClient'
import { userLock } from './wallet/userLock'
import { refund } from './wallet/refund'
import { redeemSolver } from './wallet/redeemSolver'
import { buildUserLockTx } from './wallet/buildUserLockTx'
import { buildRefundTx } from './wallet/buildRefundTx'
import { buildRedeemSolverTx } from './wallet/buildRedeemSolverTx'

export class AztecHTLCWalletClient extends AztecHTLCPublicClient implements IHTLCWalletClient {
    declare protected readonly signer: AztecSigner

    constructor(config: AztecHTLCWalletClientConfig) {
        super(config)
    }

    // ── Write Operations ───────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        return userLock(this.signer, this.rpcUrl, params, this.getNode())
    }

    async refund(params: RefundParams): Promise<string> {
        return refund(this.signer, params, this.getNode())
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        return redeemSolver(this.signer, this.rpcUrl, params, this.getNode())
    }

    // ── Transaction Builders ──────────────────────────────────────────
    // Return prepared `ContractFunctionInteraction`s ready to be batched
    // and submitted. Registering Train/Token contracts on the wallet is a
    // side effect — that's required by Aztec before `.at(...)` works.

    async buildUserLockTx(params: UserLockParams): Promise<AztecTransactionRequest[]> {
        return buildUserLockTx(this.signer, this.rpcUrl, params, this.getNode())
    }

    async buildRefundTx(params: RefundParams): Promise<AztecTransactionRequest> {
        return buildRefundTx(this.signer, params, this.getNode())
    }

    async buildRedeemSolverTx(params: RedeemSolverParams): Promise<AztecTransactionRequest> {
        return buildRedeemSolverTx(this.signer, this.rpcUrl, params, this.getNode())
    }
}
