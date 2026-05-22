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
import { TronRpcClient } from '../rpc.js'
import type { TronHTLCPublicClientConfig } from '../types.js'
import { getUserLockDetails } from './public/getUserLockDetails.js'
import { getSolverLockDetails } from './public/getSolverLockDetails.js'
import { recoverSwap } from './public/recoverSwap.js'
import { getTransaction } from './public/getTransaction.js'
import { getTrc20Allowance } from './public/getTrc20Allowance.js'

export class TronHTLCPublicClient extends HTLCPublicClient {
    protected rpc: TronRpcClient
    protected apiKey: string | undefined

    constructor(config: TronHTLCPublicClientConfig) {
        super()
        this.rpc = new TronRpcClient(config.rpcUrl, config.apiKey)
        this.apiKey = config.apiKey
    }

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        return getUserLockDetails(this.rpc, params)
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        return getSolverLockDetails(params, nodeUrl, this.apiKey)
    }

    async recoverSwap(txHash: string, network: Network): Promise<UserLockDetails> {
        return recoverSwap(this.rpc, txHash, network)
    }

    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        return getTransaction(this.rpc, txHash)
    }

    async getTrc20Allowance(token: string, owner: string, spender: string): Promise<bigint> {
        return getTrc20Allowance(this.rpc, token, owner, spender)
    }
}
