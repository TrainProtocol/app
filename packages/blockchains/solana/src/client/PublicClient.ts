import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { HTLCPublicClient } from '@train-protocol/sdk'
import type { LockParams, Network, UserLockDetails, SolverLockDetails, TransactionInfo } from '@train-protocol/sdk'
import type { SolanaHTLCPublicClientConfig } from '../types.js'
import { NATIVE_SOL_ADDRESS } from '../constants.js'
import { buildProgram as buildProgramHelper } from './helpers.js'
import { getUserLockDetails as getUserLockDetailsFn } from './public/getUserLockDetails.js'
import { getSolverLockDetails as getSolverLockDetailsFn } from './public/getSolverLockDetails.js'
import { recoverSwap as recoverSwapFn } from './public/recoverSwap.js'
import { getTransaction as getTransactionFn } from './public/getTransaction.js'

export class SolanaHTLCPublicClient extends HTLCPublicClient {
    protected connection: Connection

    constructor(config: SolanaHTLCPublicClientConfig) {
        super()
        this.connection = new Connection(config.rpcUrl, 'confirmed')
    }

    // ── Read Operations ────────────────────────────────────────────────

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> {
        return getUserLockDetailsFn(this.connection, params, (contractAddress, connection) =>
            this.buildProgram(contractAddress, undefined, connection)
        )
    }

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        return getSolverLockDetailsFn(params, nodeUrl, (contractAddress, connection) =>
            this.buildProgram(contractAddress, undefined, connection)
        )
    }

    async recoverSwap(txHash: string, network: Network): Promise<UserLockDetails> {
        return recoverSwapFn(this.connection, txHash, network, (params) => this.getUserLockDetails(params))
    }

    // ── Public Helpers ─────────────────────────────────────────────────

    async getTransaction(txHash: string): Promise<TransactionInfo | null> {
        return getTransactionFn(this.connection, txHash)
    }

    // ── Protected Helpers ──────────────────────────────────────────────

    protected buildProgram(contractAddress: string, readerKey?: PublicKey, connection?: Connection): Program {
        return buildProgramHelper(contractAddress, connection ?? this.connection, readerKey ?? new PublicKey(NATIVE_SOL_ADDRESS))
    }
}
