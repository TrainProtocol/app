import { getContractInstanceFromInstantiationParams } from '@aztec/aztec.js/contracts'
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
    private _sponsoredFPCInstance?: Awaited<ReturnType<typeof getContractInstanceFromInstantiationParams>>

    constructor(config: AztecHTLCWalletClientConfig) {
        super(config)
    }

    // ── Write Operations ───────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> {
        const { result, fpcInstance } = await userLock(
            this.signer,
            this.rpcUrl,
            params,
            this.getNode(),
            this._sponsoredFPCInstance,
        )
        this._sponsoredFPCInstance = fpcInstance
        return result
    }

    async refund(params: RefundParams): Promise<string> {
        const { hash, fpcInstance } = await refund(
            this.signer,
            params,
            this.getNode(),
            this._sponsoredFPCInstance,
        )
        this._sponsoredFPCInstance = fpcInstance
        return hash
    }

    async redeemSolver(params: RedeemSolverParams): Promise<string> {
        const { hash, fpcInstance } = await redeemSolver(
            this.signer,
            this.rpcUrl,
            params,
            this.getNode(),
            this._sponsoredFPCInstance,
        )
        this._sponsoredFPCInstance = fpcInstance
        return hash
    }
}
