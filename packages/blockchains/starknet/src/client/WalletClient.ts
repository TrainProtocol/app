import type {
    IHTLCWalletClient,
    UserLockParams,
    RefundParams,
    RedeemSolverParams,
    AtomicResult,
} from '@train-protocol/sdk'
import type { StarknetHTLCWalletClientConfig, StarknetSigner } from '../types.js'
import { StarknetHTLCPublicClient } from './PublicClient.js'
import { userLock } from './wallet/userLock.js'
import { refund } from './wallet/refund.js'
import { redeemSolver } from './wallet/redeemSolver.js'

export class StarknetHTLCWalletClient extends StarknetHTLCPublicClient implements IHTLCWalletClient {
    private signer: StarknetSigner

    constructor(config: StarknetHTLCWalletClientConfig) {
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
}
