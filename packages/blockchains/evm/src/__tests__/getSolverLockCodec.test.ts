import { describe, it, expect } from 'vitest'
import { AbiFunction } from 'ox'
import { LockStatus } from '@train-protocol/sdk'
import { encodeGetSolverLockData, decodeGetSolverLockResult } from '../client/public/getSolverLockDetails'
import { htlcFunctions } from '../abi'
import { ZERO_ADDRESS } from '../constants'

const hashlock = '0x' + 'ab'.repeat(32) as `0x${string}`
const solver = '0x' + '11'.repeat(20) as `0x${string}`

type SolverLockTuple = {
    secret: bigint; amount: bigint; reward: bigint; sender: string
    timelock: number; rewardTimelock: number; startTime: number
    recipient: string; status: number; rewardRecipient: string
    refundTo: string; token: string; rewardToken: string
    payoutCurve: string; payoutCurveData: `0x${string}`
}

const emptyTuple: SolverLockTuple = {
    secret: 0n, amount: 0n, reward: 0n, sender: ZERO_ADDRESS,
    timelock: 0, rewardTimelock: 0, startTime: 0,
    recipient: ZERO_ADDRESS, status: 0, rewardRecipient: ZERO_ADDRESS,
    refundTo: ZERO_ADDRESS, token: ZERO_ADDRESS, rewardToken: ZERO_ADDRESS,
    payoutCurve: ZERO_ADDRESS, payoutCurveData: '0x',
}

const encodeResult = (tuple: SolverLockTuple) =>
    AbiFunction.encodeResult(htlcFunctions.getSolverLock, tuple as any)

describe('encodeGetSolverLockData', () => {
    it('encodes the solver-keyed getSolverLock call and round-trips through decodeData', () => {
        const data = encodeGetSolverLockData(hashlock, solver)
        const [decodedHashlock, decodedSolver] = AbiFunction.decodeData(htlcFunctions.getSolverLock, data) as [string, string]
        expect(decodedHashlock).toBe(hashlock)
        expect(decodedSolver.toLowerCase()).toBe(solver.toLowerCase())
    })
})

describe('decodeGetSolverLockResult', () => {
    it('decodes a live lock into SolverLockDetails', () => {
        const raw = encodeResult({
            ...emptyTuple,
            secret: 0n, amount: 1_500_000n, reward: 25n,
            sender: solver, timelock: 1_700_000_000, rewardTimelock: 1_700_001_000,
            recipient: '0x' + '22'.repeat(20), status: 1,
            rewardRecipient: '0x' + '33'.repeat(20), refundTo: '0x' + '44'.repeat(20),
            token: '0x' + '55'.repeat(20), rewardToken: '0x' + '66'.repeat(20),
            payoutCurve: ZERO_ADDRESS, payoutCurveData: '0x1234',
        })
        const details = decodeGetSolverLockResult(raw, hashlock, 6)
        expect(details).not.toBeNull()
        expect(details!.hashlock).toBe(hashlock)
        expect(details!.sender.toLowerCase()).toBe(solver.toLowerCase())
        expect(details!.amount).toBe(1.5)
        expect(details!.amountInBaseUnits).toBe(1_500_000n)
        expect(details!.timelock).toBe(1_700_000_000)
        expect(details!.status).toBe(LockStatus.Pending)
        expect(details!.payoutCurve).toBeNull()
        expect(details!.payoutCurveData).toBe('0x1234')
    })

    it('returns null for an empty lock slot (zero sender)', () => {
        expect(decodeGetSolverLockResult(encodeResult(emptyTuple), hashlock, 18)).toBeNull()
    })

    it('preserves an active payout curve', () => {
        const payoutCurve = '0x0000000000000000000000000000000000000001'
        const raw = encodeResult({ ...emptyTuple, sender: solver, status: 1, payoutCurve, payoutCurveData: '0xabcd' })
        const details = decodeGetSolverLockResult(raw, hashlock, 18)
        expect(details!.payoutCurve?.toLowerCase()).toBe(payoutCurve)
        expect(details!.payoutCurveData).toBe('0xabcd')
    })

    it('throws on garbage that is not a getSolverLock result', () => {
        expect(() => decodeGetSolverLockResult('0x1234', hashlock, 18)).toThrow()
    })
})
