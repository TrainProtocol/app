import { describe, it, expect } from 'vitest'
import { stringToBytes } from '../utils.js'

describe('stringToBytes', () => {
    it('converts ASCII string to byte array of specified length', () => {
        const result = stringToBytes('abc', 5)
        expect(result).toHaveLength(5)
        // 'abc' is 3 bytes, left-padded with 2 spaces
        expect(result[0]).toBe(32) // space
        expect(result[1]).toBe(32) // space
        expect(result[2]).toBe(97) // 'a'
        expect(result[3]).toBe(98) // 'b'
        expect(result[4]).toBe(99) // 'c'
    })

    it('left-pads with spaces when string is shorter', () => {
        const result = stringToBytes('x', 4)
        expect(result).toHaveLength(4)
        // 3 spaces + 'x'
        expect(result[0]).toBe(32)
        expect(result[1]).toBe(32)
        expect(result[2]).toBe(32)
        expect(result[3]).toBe(120) // 'x'
    })

    it('handles exact length string', () => {
        const result = stringToBytes('hi', 2)
        expect(result).toHaveLength(2)
        expect(result[0]).toBe(104) // 'h'
        expect(result[1]).toBe(105) // 'i'
    })

    it('truncates when encoded bytes exceed length', () => {
        const result = stringToBytes('hello world', 5)
        expect(result).toHaveLength(5)
    })

    it('handles empty string', () => {
        const result = stringToBytes('', 3)
        expect(result).toHaveLength(3)
        // All spaces
        expect(result.every(b => b === 32)).toBe(true)
    })
})
