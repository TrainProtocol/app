import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { mapLockStatus, pickStarknetEventData } from '../client/helpers'

describe('mapLockStatus', () => {
    it('handles CairoCustomEnum with activeVariant method', () => {
        expect(mapLockStatus({ activeVariant: () => 'Pending' })).toBe(LockStatus.Pending)
        expect(mapLockStatus({ activeVariant: () => 'Redeemed' })).toBe(LockStatus.Redeemed)
        expect(mapLockStatus({ activeVariant: () => 'Refunded' })).toBe(LockStatus.Refunded)
        expect(mapLockStatus({ activeVariant: () => 'Unknown' })).toBe(LockStatus.Empty)
    })

    it('handles plain number status', () => {
        expect(mapLockStatus(0)).toBe(LockStatus.Empty)
        expect(mapLockStatus(1)).toBe(LockStatus.Pending)
        expect(mapLockStatus(2)).toBe(LockStatus.Refunded)
        expect(mapLockStatus(3)).toBe(LockStatus.Redeemed)
    })

    it('handles plain bigint status', () => {
        expect(mapLockStatus(1n)).toBe(LockStatus.Pending)
        expect(mapLockStatus(3n)).toBe(LockStatus.Redeemed)
    })

    it('handles variant object format', () => {
        expect(mapLockStatus({ variant: { Pending: {} } })).toBe(LockStatus.Pending)
        expect(mapLockStatus({ variant: { Redeemed: {} } })).toBe(LockStatus.Redeemed)
        expect(mapLockStatus({ variant: { Refunded: {} } })).toBe(LockStatus.Refunded)
    })

    it('returns Empty for undefined/null', () => {
        expect(mapLockStatus(undefined)).toBe(LockStatus.Empty)
        expect(mapLockStatus(null)).toBe(LockStatus.Empty)
    })

    it('returns Empty for unrecognized variant', () => {
        expect(mapLockStatus({ variant: { SomethingElse: {} } })).toBe(LockStatus.Empty)
    })
})

describe('pickStarknetEventData', () => {
    it('maps snake_case event fields to camelCase', () => {
        const result = pickStarknetEventData({
            dst_chain: 'starknet:mainnet',
            dst_address: '0xDest',
            dst_amount: 1000n,
            dst_token: '0xToken',
            user_data: 'nonce123',
            solver_data: 'solver456',
        })
        expect(result.dstChain).toBe('starknet:mainnet')
        expect(result.dstAddress).toBe('0xDest')
        expect(result.dstAmount).toBe(1000n)
        expect(result.dstToken).toBe('0xToken')
        expect(result.userData).toBe('nonce123')
        expect(result.solverData).toBe('solver456')
    })

    it('handles camelCase keys too', () => {
        const result = pickStarknetEventData({ userData: 'nonce', solverData: 'data' })
        expect(result.userData).toBe('nonce')
        expect(result.solverData).toBe('data')
    })

    it('replaces null-byte dst_token with zero address', () => {
        const result = pickStarknetEventData({ dst_token: '\u0000\u0000\u0000' })
        expect(result.dstToken).toBe('0x0000000000000000000000000000000000000000')
    })

    it('returns empty object for empty event', () => {
        expect(pickStarknetEventData({})).toEqual({})
    })

    it('skips null values', () => {
        const result = pickStarknetEventData({ dst_chain: null, dst_address: '0xDest' })
        expect(result.dstChain).toBeUndefined()
        expect(result.dstAddress).toBe('0xDest')
    })
})
