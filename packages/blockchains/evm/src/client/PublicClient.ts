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
import { JsonRpcClient } from '../rpc.js'
import type { EvmHTLCPublicClientConfig } from '../types.js'
import { getUserLockDetails } from './public/getUserLockDetails.js'
import { getSolverLockDetails } from './public/getSolverLockDetails.js'
import { recoverSwap } from './public/recoverSwap.js'
import { getTransaction } from './public/getTransaction.js'

export class EvmHTLCPublicClient extends HTLCPublicClient {
    protected rpc: JsonRpcClient

    constructor(config: EvmHTLCPublicClientConfig) {
        super()
        this.rpc = new JsonRpcClient(config.rpcUrl)
    }

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        return getUserLockDetails(this.rpc, params)
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        return getSolverLockDetails(params, nodeUrl)
    }

    async recoverSwap(txHash: string, network: Network): Promise<UserLockDetails> {
        return recoverSwap(this.rpc, txHash, network)
    }

    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        return getTransaction(this.rpc, txHash)
    }
}
