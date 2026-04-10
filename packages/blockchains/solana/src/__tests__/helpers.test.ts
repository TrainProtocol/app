import { describe, it, expect } from 'vitest'
import { parseSecret } from '../client/helpers'

describe('parseSecret', () => {
    it('returns bigint from non-zero bytes', () => {
        const bytes = new Array(32).fill(0)
        bytes[0] = 0xde
        bytes[1] = 0xad
        const result = parseSecret(bytes)
        expect(typeof result).toBe('bigint')
        expect(result > 0n).toBe(true)
    })

    it('returns 0n for all-zero bytes', () => {
        const result = parseSecret(new Array(32).fill(0))
        expect(result).toBe(0n)
    })

    it('handles Uint8Array input', () => {
        const arr = new Uint8Array(32)
        arr[0] = 0xff
        const result = parseSecret(arr)
        expect(typeof result).toBe('bigint')
        expect(result > 0n).toBe(true)
    })

    it('handles single non-zero byte at end', () => {
        const bytes = new Array(32).fill(0)
        bytes[31] = 1
        const result = parseSecret(bytes)
        expect(result).toBe(1n)
    })

    it('handles full 32-byte non-zero secret', () => {
        const bytes = new Array(32).fill(0xff)
        const result = parseSecret(bytes)
        expect(result > 0n).toBe(true)
    })
})
