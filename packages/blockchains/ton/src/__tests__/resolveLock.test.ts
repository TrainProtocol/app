import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { parseHTLCFromStack, parseSolverLockFromStack } from '../resolveLock'

// Helper to create a mock stack item that behaves like TupleReader
function mockAddressItem(address: string | null) {
    return {
        beginParse: () => ({
            loadAddress: () => address ? { toString: () => address } : null,
        }),
    }
}

function mockStack(items: any[]) {
    return { items: [{ items }] }
}

const defaultId = '0x' + 'ab'.repeat(32)

describe('TON parseHTLCFromStack', () => {
    it('parses a valid user lock stack', () => {
        const stack = mockStack([
            mockAddressItem('EQSenderAddress'),
            100n,
            mockAddressItem('EQRecipientAddress'),
            0xabcn,
            1000000000n,
            1700000000,
        ])
        const result = parseHTLCFromStack(stack, defaultId, 9)
        expect(result).not.toBeNull()
        expect(result!.sender).toBe('EQSenderAddress')
        expect(result!.recipient).toBe('EQRecipientAddress')
        expect(result!.hashlock).toBe('0xabc')
        expect(result!.amount).toBe(1)
        expect(result!.timelock).toBe(1700000000)
        expect(result!.status).toBe(LockStatus.Pending)
        expect(result!.secret).toBeUndefined()
    })

    it('returns null when stack has no items', () => {
        expect(parseHTLCFromStack({}, defaultId, 9)).toBeNull()
        expect(parseHTLCFromStack(null, defaultId, 9)).toBeNull()
        expect(parseHTLCFromStack({ items: [] }, defaultId, 9)).toBeNull()
        expect(parseHTLCFromStack({ items: [{}] }, defaultId, 9)).toBeNull()
    })

    it('returns null when sender address is null', () => {
        const stack = mockStack([mockAddressItem(null), 0n, mockAddressItem('R'), 0n, 0, 0])
        expect(parseHTLCFromStack(stack, defaultId, 9)).toBeNull()
    })

    it('uses fallback id when hashlock is 0', () => {
        const stack = mockStack([mockAddressItem('S'), 0n, mockAddressItem('R'), 0n, 0, 0])
        const result = parseHTLCFromStack(stack, defaultId, 9)
        expect(result!.hashlock).toBe(defaultId)
    })

    it('formats amount with correct decimals', () => {
        const stack = mockStack([mockAddressItem('S'), 0n, mockAddressItem('R'), 0xabcn, 1500000n, 0])
        const result = parseHTLCFromStack(stack, defaultId, 6)
        expect(result!.amount).toBe(1.5)
    })

    it('handles undefined recipient', () => {
        const stack = mockStack([
            mockAddressItem('S'), 0n,
            { beginParse: () => ({ loadAddress: () => null }) },
            0xabcn, 0, 0,
        ])
        const result = parseHTLCFromStack(stack, defaultId, 9)
        expect(result!.recipient).toBeUndefined()
    })

    it('always returns Pending status', () => {
        const stack = mockStack([mockAddressItem('S'), 0n, mockAddressItem('R'), 0xabcn, 0, 0])
        const result = parseHTLCFromStack(stack, defaultId, 9)
        expect(result!.status).toBe(LockStatus.Pending)
    })
})

describe('TON parseSolverLockFromStack', () => {
    it('parses a valid solver lock stack', () => {
        const stack = mockStack([
            mockAddressItem('EQSolverAddress'),
            mockAddressItem('EQUserAddress'),
            0xdefn,
            2000000000n,
            1700001000,
        ])
        const result = parseSolverLockFromStack(stack, defaultId, 9)
        expect(result).not.toBeNull()
        expect(result!.sender).toBe('EQSolverAddress')
        expect(result!.recipient).toBe('EQUserAddress')
        expect(result!.hashlock).toBe('0xdef')
        expect(result!.amount).toBe(2)
    })

    it('returns null when stack is empty or sender is null', () => {
        expect(parseSolverLockFromStack(null, defaultId, 9)).toBeNull()
        const stack = mockStack([mockAddressItem(null), mockAddressItem('U'), 0n, 0, 0])
        expect(parseSolverLockFromStack(stack, defaultId, 9)).toBeNull()
    })

    it('uses fallback id when hashlock is 0', () => {
        const stack = mockStack([mockAddressItem('S'), mockAddressItem('U'), 0n, 0, 0])
        const result = parseSolverLockFromStack(stack, defaultId, 9)
        expect(result!.hashlock).toBe(defaultId)
    })
})

describe('TON recoverSwap tx hash validation', () => {
    const regex = /^(0x)?[a-fA-F0-9]{64}$/

    it('accepts valid TON tx hash formats', () => {
        expect(regex.test('a'.repeat(64))).toBe(true)
        expect(regex.test('0x' + 'a'.repeat(64))).toBe(true)
    })

    it('rejects invalid formats', () => {
        expect(regex.test('short')).toBe(false)
        expect(regex.test('0x' + 'a'.repeat(63))).toBe(false)
    })
})
