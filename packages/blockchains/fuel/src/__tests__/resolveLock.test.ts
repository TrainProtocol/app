import { DateTime } from 'fuels'
import { describe, expect, it } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { resolveSolverLock } from '../client/public/getSolverLockDetails'
import { resolveUserLock } from '../client/public/getUserLockDetails'
import type { FuelSolverLock, FuelUserLock } from '../types'

const ADDRESS = `0x${'11'.repeat(32)}`
const RECIPIENT = `0x${'22'.repeat(32)}`
const ASSET_ID = `0x${'33'.repeat(32)}`
const REWARD_ASSET_ID = `0x${'44'.repeat(32)}`
const HASHLOCK = `0x${'55'.repeat(32)}`
const TIMELOCK = DateTime.fromUnixSeconds(2_000_000_000).toTai64()

function userLock(overrides: Partial<FuelUserLock> = {}): FuelUserLock {
    return {
        secret: 7,
        amount: 1_500_000,
        sender: { Address: { bits: ADDRESS } },
        timelock: TIMELOCK,
        start_time: TIMELOCK,
        status: 'Pending',
        recipient: { Address: { bits: RECIPIENT } },
        refund_to: { Address: { bits: ADDRESS } },
        asset_id: { bits: ASSET_ID },
        ...overrides,
    }
}

describe('Fuel resolveUserLock', () => {
    it('maps identities, TAI64 time, status, and exact base units', () => {
        expect(resolveUserLock(userLock(), HASHLOCK, 6)).toEqual({
            hashlock: HASHLOCK,
            secret: 7n,
            amount: 1.5,
            amountInBaseUnits: 1_500_000n,
            sender: ADDRESS,
            timelock: 2_000_000_000,
            status: LockStatus.Pending,
            recipient: RECIPIENT,
            token: ASSET_ID,
            refundTo: ADDRESS,
            payoutCurve: null,
            payoutCurveData: '0x',
        })
    })

    it('returns null for an empty lock', () => {
        expect(resolveUserLock(userLock({ status: 'Empty' }), HASHLOCK, 6)).toBeNull()
    })

    it('maps terminal statuses', () => {
        expect(resolveUserLock(userLock({ status: 'Refunded' }), HASHLOCK, 6)?.status)
            .toBe(LockStatus.Refunded)
        expect(resolveUserLock(userLock({ status: 'Redeemed' }), HASHLOCK, 6)?.status)
            .toBe(LockStatus.Redeemed)
    })
})

describe('Fuel resolveSolverLock', () => {
    it('maps rewards and preserves the 1-based index', () => {
        const result = resolveSolverLock({
            ...userLock(),
            reward: 250_000,
            reward_timelock: TIMELOCK,
            reward_recipient: { ContractId: { bits: RECIPIENT } },
            reward_asset_id: { bits: REWARD_ASSET_ID },
            reward_funded: true,
        } as FuelSolverLock, HASHLOCK, 6, 2)

        expect(result).toMatchObject({
            amount: 1.5,
            amountInBaseUnits: 1_500_000n,
            reward: 0.25,
            rewardToken: REWARD_ASSET_ID,
            rewardRecipient: RECIPIENT,
            rewardTimelock: 2_000_000_000,
            payoutCurve: null,
            payoutCurveData: '0x',
            index: 2,
        })
    })

    it('returns null for an empty solver lock', () => {
        expect(resolveSolverLock({
            ...userLock({ status: 'Empty' }),
            reward: 0,
            reward_timelock: TIMELOCK,
            reward_recipient: { Address: { bits: RECIPIENT } },
            reward_asset_id: { bits: REWARD_ASSET_ID },
            reward_funded: false,
        } as FuelSolverLock, HASHLOCK, 6, 1)).toBeNull()
    })
})
