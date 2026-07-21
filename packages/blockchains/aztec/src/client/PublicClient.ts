import type { AztecNode } from '@aztec/aztec.js/node'
import {
    HTLCPublicClient,
} from '@train-protocol/sdk'
import type {
    LockParams,
    Network,
    UserLockDetails,
    SolverLockDetails,
    TransactionInfo,
} from '@train-protocol/sdk'
import type { AztecHTLCPublicClientConfig, AztecSigner } from '../types'
import { getNode } from './helpers'
import { getUserLockDetails } from './public/getUserLockDetails'
import { getSolverLockDetails } from './public/getSolverLockDetails'
import { recoverSwap } from './public/recoverSwap'
import { getTransaction } from './public/getTransaction'

export class AztecHTLCPublicClient extends HTLCPublicClient {
    protected readonly rpcUrl: string
    protected readonly signer?: AztecSigner
    protected _node?: AztecNode

    constructor(config: AztecHTLCPublicClientConfig) {
        super()
        this.rpcUrl = config.rpcUrl
        this.signer = config.signer
        this.consensusOptions = { minQuorum: 1, batchSize: 1 }
    }

    // ── Read Operations ────────────────────────────────────────────────

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        return getUserLockDetails(this.getNode(), params)
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        return getSolverLockDetails(params, nodeUrl)
    }

    async recoverSwap(txHash: string, network: Network): Promise<UserLockDetails> {
        return recoverSwap(this.getNode(), txHash, network)
    }

    // ── Public Helpers ─────────────────────────────────────────────────

    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        return getTransaction(this.getNode(), txHash)
    }

    // ── Protected Helpers ──────────────────────────────────────────────

    protected getNode(): AztecNode {
        if (!this._node) {
            this._node = getNode(this.rpcUrl)
        }
        return this._node
    }
}
