import { describe, it, expect } from 'vitest'
import { deriveSecretFromTimelock, secretToHashlock } from '../secret'
import { bytesToHex } from '../utils'

describe('deriveSecretFromTimelock', () => {
    const key = new Uint8Array(32).fill(42)

    it('returns 32 bytes', () => {
        const result = deriveSecretFromTimelock(key, 1000)
        expect(result).toBeInstanceOf(Uint8Array)
        expect(result.length).toBe(32)
    })

    it('is deterministic', () => {
        const a = deriveSecretFromTimelock(key, 1000)
        const b = deriveSecretFromTimelock(key, 1000)
        expect(bytesToHex(Array.from(a))).toBe(bytesToHex(Array.from(b)))
    })

    it('produces different secrets for different timelocks', () => {
        const a = deriveSecretFromTimelock(key, 1000)
        const b = deriveSecretFromTimelock(key, 2000)
        expect(bytesToHex(Array.from(a))).not.toBe(bytesToHex(Array.from(b)))
    })

    it('produces different secrets for different keys', () => {
        const key2 = new Uint8Array(32).fill(99)
        const a = deriveSecretFromTimelock(key, 1000)
        const b = deriveSecretFromTimelock(key2, 1000)
        expect(bytesToHex(Array.from(a))).not.toBe(bytesToHex(Array.from(b)))
    })

    it('handles odd-length hex timelocks (normalizeHex padding)', () => {
        // timelock=15 → hex "f" → padded to "0f"
        const result = deriveSecretFromTimelock(key, 15)
        expect(result.length).toBe(32)
    })

    it('handles timelock=0', () => {
        const result = deriveSecretFromTimelock(key, 0)
        expect(result.length).toBe(32)
    })

    it('handles large timelocks', () => {
        const result = deriveSecretFromTimelock(key, 2147483647)
        expect(result.length).toBe(32)
    })
})

describe('secretToHashlock', () => {
    it('produces a 0x-prefixed 64-char hex string', () => {
        expect(secretToHashlock('aabbccdd')).toMatch(/^0x[a-f0-9]{64}$/)
    })

    it('is deterministic', () => {
        expect(secretToHashlock('deadbeef')).toBe(secretToHashlock('deadbeef'))
    })

    it('handles 0x-prefixed input', () => {
        expect(secretToHashlock('0xdeadbeef')).toBe(secretToHashlock('deadbeef'))
    })

    it('produces different hashlocks for different secrets', () => {
        expect(secretToHashlock('aaaa')).not.toBe(secretToHashlock('bbbb'))
    })
})

describe('round-trip: secret → hashlock', () => {
    it('deriveSecretFromTimelock output can be hashed to a consistent hashlock', () => {
        const key = new Uint8Array(32).fill(7)
        const secret = deriveSecretFromTimelock(key, 12345)
        const secretHex = bytesToHex(Array.from(secret)).slice(2) // strip 0x for secretToHashlock

        const hashlock1 = secretToHashlock(secretHex)
        const hashlock2 = secretToHashlock('0x' + secretHex)

        expect(hashlock1).toBe(hashlock2)
        expect(hashlock1).toMatch(/^0x[a-f0-9]{64}$/)
    })
})
