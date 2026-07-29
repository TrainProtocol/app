import { Provider } from 'fuels'
import { HTLCPublicClient } from '@train-protocol/sdk'
import type {
    LockParams,
    Network,
    SolverLockDetails,
    TransactionInfo,
    UserLockDetails,
} from '@train-protocol/sdk'
import type { FuelHTLCPublicClientConfig } from '../types.js'
import { getSolverLockDetails } from './public/getSolverLockDetails.js'
import { getTransaction } from './public/getTransaction.js'
import { getUserLockDetails } from './public/getUserLockDetails.js'
import { recoverSwap } from './public/recoverSwap.js'

export class FuelHTLCPublicClient extends HTLCPublicClient {
    protected provider: Provider

    constructor(config: FuelHTLCPublicClientConfig) {
        super()
        this.provider = new Provider(config.rpcUrl)
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
