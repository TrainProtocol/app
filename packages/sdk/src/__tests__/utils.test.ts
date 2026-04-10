import { describe, it, expect } from 'vitest'
import { parseUnits, formatUnits, hexToBytes, bytesToHex, toHex32 } from '../utils'

describe('parseUnits', () => {
    it('parses integer values', () => {
        expect(parseUnits('1', 18)).toBe(1000000000000000000n)
        expect(parseUnits('100', 6)).toBe(100000000n)
    })

    it('parses decimal values', () => {
        expect(parseUnits('1.5', 18)).toBe(1500000000000000000n)
        expect(parseUnits('0.1', 6)).toBe(100000n)
    })

    it('parses values with trailing zeros in fraction', () => {
        expect(parseUnits('1.50', 18)).toBe(1500000000000000000n)
    })

    it('parses zero', () => {
        expect(parseUnits('0', 18)).toBe(0n)
        expect(parseUnits('0.0', 6)).toBe(0n)
    })

    it('parses negative values', () => {
        expect(parseUnits('-1', 18)).toBe(-1000000000000000000n)
        expect(parseUnits('-1.5', 6)).toBe(-1500000n)
    })

    it('handles decimals=0', () => {
        expect(parseUnits('5', 0)).toBe(5n)
    })

    it('rounds when decimals=0 and fraction >= 0.5', () => {
        expect(parseUnits('5.6', 0)).toBe(6n)
    })

    it('rounds when fraction exceeds decimals', () => {
        expect(parseUnits('1.999', 2)).toBe(200n)
    })

    it('handles very small fractions', () => {
        expect(parseUnits('0.000001', 18)).toBe(1000000000000n)
        expect(parseUnits('0.000001', 6)).toBe(1n)
    })

    it('throws on invalid input', () => {
        expect(() => parseUnits('abc', 18)).toThrow('Invalid decimal number')
        expect(() => parseUnits('1.2.3', 18)).toThrow('Invalid decimal number')
    })

    it('handles fraction with carry propagation', () => {
        expect(parseUnits('1.9999', 2)).toBe(200n)
    })
})

describe('formatUnits', () => {
    it('formats basic values', () => {
        expect(formatUnits(1000000000000000000n, 18)).toBe('1')
        expect(formatUnits(1500000000000000000n, 18)).toBe('1.5')
    })

    it('formats zero', () => {
        expect(formatUnits(0n, 18)).toBe('0')
    })

    it('formats sub-unit values', () => {
        expect(formatUnits(1n, 18)).toBe('0.000000000000000001')
    })

    it('formats negative values', () => {
        expect(formatUnits(-1500000n, 6)).toBe('-1.5')
    })

    it('strips trailing zeros', () => {
        expect(formatUnits(1500000000000000000n, 18)).toBe('1.5')
        expect(formatUnits(100000000n, 6)).toBe('100')
    })

    it('handles decimals=0', () => {
        expect(formatUnits(42n, 0)).toBe('42')
    })
})

describe('parseUnits + formatUnits round-trip', () => {
    for (const value of ['1', '0.5', '100', '0.000001', '999.999']) {
        it(`round-trips "${value}" with 18 decimals`, () => {
            expect(formatUnits(parseUnits(value, 18), 18)).toBe(value)
        })
    }
})

describe('hexToBytes', () => {
    it('converts hex string to byte array', () => {
        expect(hexToBytes('aabb', 2)).toEqual([0xaa, 0xbb])
    })

    it('handles 0x prefix', () => {
        expect(hexToBytes('0xaabb', 2)).toEqual([0xaa, 0xbb])
    })

    it('throws on length mismatch', () => {
        expect(() => hexToBytes('aabb', 3)).toThrow('Expected 3 bytes, got 2')
    })

    it('handles 32-byte input', () => {
        expect(hexToBytes('a'.repeat(64), 32)).toHaveLength(32)
    })
})

describe('bytesToHex', () => {
    it('converts byte array to 0x-prefixed hex', () => {
        expect(bytesToHex([0xaa, 0xbb])).toBe('0xaabb')
    })

    it('pads single-digit hex values', () => {
        expect(bytesToHex([0, 1, 15])).toBe('0x00010f')
    })

    it('handles empty array', () => {
        expect(bytesToHex([])).toBe('0x')
    })

    it('handles bigint values', () => {
        expect(bytesToHex([255n, 0n])).toBe('0xff00')
    })
})

describe('hexToBytes + bytesToHex round-trip', () => {
    it('round-trips correctly', () => {
        const original = [0xde, 0xad, 0xbe, 0xef]
        expect(hexToBytes(bytesToHex(original), 4)).toEqual(original)
    })
})

describe('toHex32', () => {
    it('produces 0x-prefixed 66-char string', () => {
        expect(toHex32(1n)).toMatch(/^0x[0-9a-f]{64}$/)
    })

    it('pads small values', () => {
        expect(toHex32(0n)).toBe('0x' + '0'.repeat(64))
        expect(toHex32(1n)).toBe('0x' + '0'.repeat(63) + '1')
    })

    it('handles max 256-bit value', () => {
        expect(toHex32((1n << 256n) - 1n)).toBe('0x' + 'f'.repeat(64))
    })
})
