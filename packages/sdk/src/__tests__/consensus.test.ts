import { describe, expect, it } from 'vitest'
import {
    HTLCPublicClient,
    type LockParams,
    type Network,
    type SolverLockDetails,
    type TransactionInfo,
    type UserLockDetails,
} from '../index'
import { LockStatus } from '../types/lock'

const params: LockParams = {
    id: '0xabc',
    chainId: '1',
    decimals: 18,
    contractAddress: '0xcontract',
}

const lock: SolverLockDetails = {
    hashlock: params.id,
    sender: '0xsolver',
    recipient: '0xuser',
    token: '0xtoken',
    amount: 1,
    amountInBaseUnits: 1_000_000_000_000_000_000n,
    secret: 0n,
    timelock: 10_000,
    status: LockStatus.Pending,
    index: 1,
    payoutCurve: 'curve',
}

class ConsensusClient extends HTLCPublicClient {
    constructor(private readonly locks: Record<string, SolverLockDetails | null>) {
        super()
    }

    getSolverLockDetails(_params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
        return Promise.resolve(this.locks[nodeUrl] ?? null)
    }

    getUserLockDetails(_params: LockParams): Promise<UserLockDetails | null> {
        return Promise.resolve(null)
    }

    recoverSwap(_txHash: string, _network: Network): Promise<UserLockDetails> {
        throw new Error('not used')
    }

    getTransaction(_txHash: string): Promise<TransactionInfo | null> {
        return Promise.resolve(null)
    }
}

describe('solver lock consensus', () => {
    it('rejects nodes that report different solver lock indices', async () => {
        const client = new ConsensusClient({
            a: lock,
            b: { ...lock, index: 2 },
        })

        await expect(client.getSolverLockDetailsWithConsensus(params, ['a', 'b']))
            .rejects.toThrow('do not match')
    })

    it('rejects raw amount disagreement hidden by equal formatted numbers', async () => {
        const client = new ConsensusClient({
            a: lock,
            b: { ...lock, amountInBaseUnits: lock.amountInBaseUnits! + 1n },
        })

        await expect(client.getSolverLockDetailsWithConsensus(params, ['a', 'b']))
            .rejects.toThrow('do not match')
    })

    it('rejects payout-curve disagreement', async () => {
        const client = new ConsensusClient({
            a: lock,
            b: { ...lock, payoutCurve: 'other-curve' },
        })

        await expect(client.getSolverLockDetailsWithConsensus(params, ['a', 'b']))
            .rejects.toThrow('do not match')
    })
})
