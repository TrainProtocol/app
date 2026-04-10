import type {
    IHTLCWalletClient,
    UserLockParams,
    RefundParams,
    RedeemSolverParams,
    AtomicResult,
} from '@train-protocol/sdk'
import type { EvmHTLCWalletClientConfig, EvmSigner } from '../types.js'
import { EvmHTLCPublicClient } from './PublicClient.js'
import { userLock } from './wallet/userLock.js'
import { refund } from './wallet/refund.js'
import { redeemSolver } from './wallet/redeemSolver.js'

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
}
