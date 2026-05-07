import type {
    IHTLCWalletClient,
    UserLockParams,
    RefundParams,
    RedeemSolverParams,
    AtomicResult,
} from '@train-protocol/sdk'
import type { AztecHTLCWalletClientConfig, AztecSigner } from '../types'
import { AztecHTLCPublicClient } from './PublicClient'
import { userLock } from './wallet/userLock'
import { refund } from './wallet/refund'
import { redeemSolver } from './wallet/redeemSolver'

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
}
