import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { resolveUserLock } from '../client/public/getUserLockDetails'
import { resolveSolverLock } from '../client/public/getSolverLockDetails'
import { NATIVE_SOL_ADDRESS } from '../constants'

const hashlock = '0x' + 'ab'.repeat(32)

function mockUserLock(overrides: Record<string, any> = {}) {
    return {
        sender: overrides.sender ?? PublicKey.unique(),
        recipient: overrides.recipient ?? PublicKey.unique(),
        refundTo: overrides.refundTo ?? PublicKey.unique(),
        tokenMint: overrides.tokenMint ?? PublicKey.unique(),
        rentPayer: overrides.rentPayer ?? PublicKey.unique(),
        payoutCurve: overrides.payoutCurve ?? PublicKey.unique(),
        payoutCurveData: overrides.payoutCurveData ?? [],
        amount: overrides.amount ?? new BN('1000000000'),
        timelock: overrides.timelock ?? new BN('1700000000'),
        startTime: overrides.startTime ?? new BN('1699990000'),
        secret: overrides.secret ?? new Array(32).fill(0),
        status: overrides.status ?? 1,
        ...overrides,
    }
}

describe('Solana resolveUserLock', () => {
    it('resolves a basic user lock', () => {
        const data = mockUserLock()
        const result = resolveUserLock(data, hashlock, 9)
        expect(result).not.toBeNull()
        expect(result!.amount).toBe(1)
        expect(result!.timelock).toBe(1700000000)
        expect(result!.sender).toBe(data.sender.toString())
        expect(result!.refundTo).toBe(data.refundTo.toString())
        expect(result!.payoutCurve).toBe(data.payoutCurve.toString())
    })

    it('returns null when sender is NATIVE_SOL_ADDRESS', () => {
        const data = mockUserLock({ sender: new PublicKey(NATIVE_SOL_ADDRESS) })
        expect(resolveUserLock(data, hashlock, 9)).toBeNull()
    })

    it('normalizes hashlock with 0x prefix', () => {
        const data = mockUserLock()
        expect(resolveUserLock(data, '0xaabb', 9)!.hashlock).toBe('0xaabb')
        expect(resolveUserLock(data, 'aabb', 9)!.hashlock).toBe('0xaabb')
    })

    it('formats amount with correct decimals', () => {
        const data = mockUserLock({ amount: new BN('1500000') })
        expect(resolveUserLock(data, hashlock, 6)!.amount).toBe(1.5)
    })

    it('maps status values correctly', () => {
        for (const [input, expected] of [[0, LockStatus.Empty], [1, LockStatus.Pending], [2, LockStatus.Refunded], [3, LockStatus.Redeemed]] as const) {
            const data = mockUserLock({ status: input })
            expect(resolveUserLock(data, hashlock, 9)!.status).toBe(expected)
        }
    })
})

describe('Solana resolveSolverLock', () => {
    it('resolves solver lock with reward fields and index', () => {
        const data = {
            ...mockUserLock({ amount: new BN('2000000000') }),
            reward: new BN('100000000'),
            rewardTimelock: new BN('1700001000'),
            rewardRecipient: PublicKey.unique(),
            rewardTokenMint: PublicKey.unique(),
        }
        const result = resolveSolverLock(data, hashlock, 9, 2)
        expect(result).not.toBeNull()
        expect(result!.amount).toBe(2)
        expect(result!.index).toBe(2)
        expect(result!.rewardRecipient).toBe(data.rewardRecipient.toString())
        expect(result!.refundTo).toBe(data.refundTo.toString())
        expect(result!.payoutCurve).toBe(data.payoutCurve.toString())
    })

    it('returns null when sender is NATIVE_SOL_ADDRESS', () => {
        const data = {
            ...mockUserLock({ sender: new PublicKey(NATIVE_SOL_ADDRESS) }),
            reward: new BN('0'), rewardTimelock: new BN('0'),
            rewardRecipient: PublicKey.unique(), rewardTokenMint: PublicKey.unique(),
        }
        expect(resolveSolverLock(data, hashlock, 9, 1)).toBeNull()
    })

    it('normalizes the native-address sentinel to null so it reads as "no curve"', () => {
        const data = {
            ...mockUserLock({ payoutCurve: new PublicKey(NATIVE_SOL_ADDRESS) }),
            reward: new BN('0'), rewardTimelock: new BN('0'),
            rewardRecipient: PublicKey.unique(), rewardTokenMint: PublicKey.unique(),
        }
        expect(resolveSolverLock(data, hashlock, 9, 1)!.payoutCurve).toBeNull()
    })
})
