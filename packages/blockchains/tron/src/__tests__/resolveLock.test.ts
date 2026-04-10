import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { resolveUserLock } from '../client/public/getUserLockDetails'
import { resolveSolverLock } from '../client/public/getSolverLockDetails'
import { ZERO_ADDRESS } from '../constants'

const hashlock = '0x' + 'ab'.repeat(32)

describe('Tron resolveUserLock', () => {
    it('resolves a basic user lock', () => {
        const result = resolveUserLock({
            sender: '0xSender', recipient: '0xRecipient', token: '0xToken',
            amount: 1000000n, timelock: 1700000000n, status: 1n, secret: 0n,
        }, hashlock, 6)
        expect(result).not.toBeNull()
        expect(result!.amount).toBe(1)
        expect(result!.timelock).toBe(1700000000)
    })

    it('returns null when sender is ZERO_ADDRESS', () => {
        expect(resolveUserLock({
            sender: ZERO_ADDRESS, recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 1n, status: 0n, secret: 0n,
        }, hashlock, 18)).toBeNull()
    })

    it('returns null when timelock is falsy', () => {
        expect(resolveUserLock({
            sender: '0xS', recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 0n, status: 0n, secret: 0n,
        }, hashlock, 18)).toBeNull()
    })

    it('formats amount with correct decimals', () => {
        const result = resolveUserLock({
            sender: '0xS', recipient: '0xR', token: '0xT',
            amount: 1500000n, timelock: 1n, status: 1n, secret: 0n,
        }, hashlock, 6)
        expect(result!.amount).toBe(1.5)
    })
})

describe('Tron resolveSolverLock', () => {
    it('resolves solver lock with index', () => {
        const result = resolveSolverLock({
            sender: '0xSolver', recipient: '0xUser', token: '0xToken',
            amount: 2000000n, timelock: 1700000000n, status: 1n, secret: 0n,
        }, hashlock, 6, 1)
        expect(result).not.toBeNull()
        expect(result!.amount).toBe(2)
        expect(result!.index).toBe(1)
    })

    it('returns null when sender is ZERO_ADDRESS', () => {
        expect(resolveSolverLock({
            sender: ZERO_ADDRESS, recipient: '0xR', token: '0xT',
            amount: 0n, timelock: 0n, status: 0n, secret: 0n,
        }, hashlock, 18, 1)).toBeNull()
    })
})
