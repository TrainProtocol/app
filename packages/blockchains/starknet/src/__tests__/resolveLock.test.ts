import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { resolveUserLock } from '../client/public/getUserLockDetails'
import { resolveSolverLock } from '../client/public/getSolverLockDetails'

const hashlock = '0x' + 'ab'.repeat(32)

describe('Starknet resolveUserLock', () => {
    it('resolves a basic user lock', () => {
        const result = resolveUserLock({
            sender: 0x123n, recipient: 0x456n, token: 0x789n,
            amount: 1000000000000000000n, timelock: 1700000000n, status: 1, secret: 0n,
        }, hashlock, 18)
        expect(result).not.toBeNull()
        expect(result!.amount).toBe(1)
        expect(result!.timelock).toBe(1700000000)
    })

    it('returns null when sender is zero', () => {
        expect(resolveUserLock({
            sender: 0n, recipient: 0x456n, token: 0x789n,
            amount: 0n, timelock: 0n, status: 0, secret: 0n,
        }, hashlock, 18)).toBeNull()
    })

    it('formats addresses with padding', () => {
        const result = resolveUserLock({
            sender: 0x123n, recipient: 0xabcn, token: 0xdefn,
            amount: 0n, timelock: 0n, status: 1, secret: 0n,
        }, hashlock, 18)
        expect(result!.recipient.length).toBe(66)
        expect(result!.token.length).toBe(66)
    })

    it('formats amount with correct decimals', () => {
        const result = resolveUserLock({
            sender: 0x123n, recipient: 0x456n, token: 0x789n,
            amount: 1500000n, timelock: 0n, status: 1, secret: 0n,
        }, hashlock, 6)
        expect(result!.amount).toBe(1.5)
    })
})

describe('Starknet resolveSolverLock', () => {
    it('resolves solver lock with reward fields', () => {
        const result = resolveSolverLock({
            sender: 0x123n, recipient: 0x456n, token: 0x789n,
            amount: 2000000000000000000n, timelock: 1700000000n, status: 1, secret: 0n,
            reward: 100000000000000000n, reward_timelock: 1700001000n,
            reward_recipient: 0xaaan, reward_token: 0xbbbn,
        }, hashlock, 18, 1)
        expect(result).not.toBeNull()
        expect(result!.amount).toBe(2)
        expect(result!.reward).toBe(0.1)
        expect(result!.rewardTimelock).toBe(1700001000)
        expect(result!.index).toBe(1)
    })

    it('returns null when sender is zero', () => {
        expect(resolveSolverLock({
            sender: 0n, recipient: 0x456n, token: 0x789n,
            amount: 0n, timelock: 0n, status: 0, secret: 0n,
            reward: 0n, reward_timelock: 0n, reward_recipient: 0n, reward_token: 0n,
        }, hashlock, 18, 1)).toBeNull()
    })
})
