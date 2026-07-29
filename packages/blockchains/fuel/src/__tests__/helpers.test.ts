import { describe, expect, it } from 'vitest'
import { findUserLockedEvent } from '../client/helpers'
import {
    identityToAddress,
    isFuelTxHash,
    mapFuelLockStatus,
} from '../utils'
import { LockStatus } from '@train-protocol/sdk'

describe('Fuel helpers', () => {
    it('maps Sway identity and lock status outputs', () => {
        const bits = `0x${'ab'.repeat(32)}`
        expect(identityToAddress({ ContractId: { bits } })).toBe(bits)
        expect(mapFuelLockStatus('Redeemed')).toBe(LockStatus.Redeemed)
    })

    it('finds the UserLocked event among other decoded logs', () => {
        const hashlock = `0x${'12'.repeat(32)}`
        const event = {
            hashlock,
            asset_id: { bits: `0x${'34'.repeat(32)}` },
            user_data: new Uint8Array([1]),
        }
        expect(findUserLockedEvent([{ reason: 'other log' }, event], hashlock)).toBe(event)
    })

    it('validates Fuel transaction IDs', () => {
        expect(isFuelTxHash(`0x${'12'.repeat(32)}`)).toBe(true)
        expect(isFuelTxHash('12'.repeat(32))).toBe(false)
        expect(isFuelTxHash('0x1234')).toBe(false)
    })
})
