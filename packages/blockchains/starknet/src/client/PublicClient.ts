import { RpcProvider } from 'starknet'
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
import type { StarknetHTLCPublicClientConfig } from '../types.js'
import { getUserLockDetails } from './public/getUserLockDetails.js'
import { getSolverLockDetails } from './public/getSolverLockDetails.js'
import { recoverSwap } from './public/recoverSwap.js'
import { getTransaction } from './public/getTransaction.js'

export class StarknetHTLCPublicClient extends HTLCPublicClient {
    protected provider: RpcProvider

    constructor(config: StarknetHTLCPublicClientConfig) {
        super()
        this.provider = new RpcProvider({ nodeUrl: config.rpcUrl })
        this.consensusOptions = { minQuorum: 1, batchSize: 1 }
    }

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        return getUserLockDetails(this.provider, params)
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        return getSolverLockDetails(params, nodeUrl)
    }

    async recoverSwap(txHash: string, network: Network): Promise<UserLockDetails> {
        return recoverSwap(this.provider, txHash, network)
    }

    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        return getTransaction(this.provider, txHash)
    }
}
