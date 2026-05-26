import { describe, it, expect } from 'vitest'
import {
    base58ToHex,
    hexToBase58,
    base58ToEvmHex,
    evmHexToBase58,
    isBase58Address,
    toEvmHex,
    toTronHex,
} from '../address'

// Known Tron address pair (TRX burn address)
const KNOWN_BASE58 = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'
const KNOWN_HEX_41 = '410000000000000000000000000000000000000000'

describe('base58ToHex / hexToBase58 round-trip', () => {
    it('converts known address from base58 to hex', () => {
        const hex = base58ToHex(KNOWN_BASE58)
        expect(hex).toBe(KNOWN_HEX_41)
    })

    it('converts known address from hex to base58', () => {
        const base58 = hexToBase58(KNOWN_HEX_41)
        expect(base58).toBe(KNOWN_BASE58)
    })

    it('round-trips base58 → hex → base58', () => {
        const hex = base58ToHex(KNOWN_BASE58)
        expect(hexToBase58(hex)).toBe(KNOWN_BASE58)
    })

    it('round-trips hex → base58 → hex', () => {
        const base58 = hexToBase58(KNOWN_HEX_41)
        expect(base58ToHex(base58)).toBe(KNOWN_HEX_41)
    })

    it('hexToBase58 handles 0x prefix', () => {
        const base58 = hexToBase58('0x' + KNOWN_HEX_41)
        expect(base58).toBe(KNOWN_BASE58)
    })

    it('throws on invalid checksum', () => {
        // Corrupt last char of a valid base58 address
        const corrupted = KNOWN_BASE58.slice(0, -1) + (KNOWN_BASE58.endsWith('a') ? 'b' : 'a')
        expect(() => base58ToHex(corrupted)).toThrow('Invalid Base58Check checksum')
    })
})

describe('base58ToEvmHex / evmHexToBase58', () => {
    it('strips 41 prefix to get 0x-prefixed 20-byte address', () => {
        const evmHex = base58ToEvmHex(KNOWN_BASE58)
        expect(evmHex).toBe('0x' + KNOWN_HEX_41.slice(2))
        expect(evmHex.length).toBe(42) // 0x + 40 hex chars
    })

    it('adds 41 prefix from 0x-prefixed 20-byte address', () => {
        const evmHex = '0x' + KNOWN_HEX_41.slice(2)
        expect(evmHexToBase58(evmHex)).toBe(KNOWN_BASE58)
    })

    it('round-trips base58 → evmHex → base58', () => {
        const evmHex = base58ToEvmHex(KNOWN_BASE58)
        expect(evmHexToBase58(evmHex)).toBe(KNOWN_BASE58)
    })
})

describe('isBase58Address', () => {
    it('returns true for valid T-prefix address', () => {
        expect(isBase58Address(KNOWN_BASE58)).toBe(true)
    })

    it('returns false for non-T-prefix', () => {
        expect(isBase58Address('0x1234')).toBe(false)
        expect(isBase58Address(KNOWN_HEX_41)).toBe(false)
    })

    it('returns false for corrupted address', () => {
        expect(isBase58Address('Txyz')).toBe(false)
    })

    it('returns false for empty string', () => {
        expect(isBase58Address('')).toBe(false)
    })
})

describe('toEvmHex', () => {
    it('converts base58 T-address to 0x hex', () => {
        const result = toEvmHex(KNOWN_BASE58)
        expect(result.startsWith('0x')).toBe(true)
    })

    it('converts 41-prefixed hex to 0x hex', () => {
        expect(toEvmHex(KNOWN_HEX_41)).toBe('0x' + KNOWN_HEX_41.slice(2))
    })

    it('passes through 0x-prefixed address', () => {
        expect(toEvmHex('0xabcdef')).toBe('0xabcdef')
    })

    it('adds 0x prefix to bare hex', () => {
        expect(toEvmHex('abcdef')).toBe('0xabcdef')
    })
})

describe('toTronHex', () => {
    it('converts base58 T-address to 41-prefixed hex', () => {
        expect(toTronHex(KNOWN_BASE58)).toBe(KNOWN_HEX_41)
    })

    it('converts 0x-prefixed hex to 41-prefixed', () => {
        const evmAddr = '0x' + '00'.repeat(20)
        expect(toTronHex(evmAddr)).toBe('41' + '00'.repeat(20))
    })

    it('passes through 41-prefixed hex', () => {
        expect(toTronHex(KNOWN_HEX_41)).toBe(KNOWN_HEX_41)
    })

    it('adds 41 prefix to bare hex', () => {
        expect(toTronHex('abcdef')).toBe('41abcdef')
    })
})
