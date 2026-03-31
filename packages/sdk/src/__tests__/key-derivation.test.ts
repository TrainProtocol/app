import { describe, it, expect } from 'vitest'
import { deriveKeyMaterial, deriveSecretFromTimelock, secretToHashlock, IDENTITY_SALT } from '../login/key-derivation'

describe('deriveKeyMaterial', () => {
    it('returns 32 bytes', () => {
        const ikm = new Uint8Array([1, 2, 3, 4])
        const salt = new Uint8Array([5, 6, 7, 8])
        const result = deriveKeyMaterial(ikm, salt)
        expect(result).toBeInstanceOf(Uint8Array)
        expect(result.length).toBe(32)
    })

    it('is deterministic', () => {
        const ikm = new Uint8Array([10, 20, 30])
        const salt = new Uint8Array([40, 50, 60])
        const a = deriveKeyMaterial(ikm, salt)
        const b = deriveKeyMaterial(ikm, salt)
        expect(Buffer.from(a).toString('hex')).toBe(Buffer.from(b).toString('hex'))
    })

    it('produces different output for different salts', () => {
        const ikm = new Uint8Array([1, 2, 3])
        const a = deriveKeyMaterial(ikm, new Uint8Array([1]))
        const b = deriveKeyMaterial(ikm, new Uint8Array([2]))
        expect(Buffer.from(a).toString('hex')).not.toBe(Buffer.from(b).toString('hex'))
    })

    it('produces different output for different input key material', () => {
        const salt = new Uint8Array([1, 2, 3])
        const a = deriveKeyMaterial(new Uint8Array([1]), salt)
        const b = deriveKeyMaterial(new Uint8Array([2]), salt)
        expect(Buffer.from(a).toString('hex')).not.toBe(Buffer.from(b).toString('hex'))
    })
})

describe('deriveSecretFromTimelock', () => {
    const key = Buffer.from('test-key-material-32-bytes-long!', 'utf8')

    it('is deterministic for same key and timelock', () => {
        const a = deriveSecretFromTimelock(key, 1000)
        const b = deriveSecretFromTimelock(key, 1000)
        expect(a.toString('hex')).toBe(b.toString('hex'))
    })

    it('returns 32 bytes', () => {
        const result = deriveSecretFromTimelock(key, 1000)
        expect(result.length).toBe(32)
    })

    it('produces different secrets for different timelocks', () => {
        const a = deriveSecretFromTimelock(key, 1000)
        const b = deriveSecretFromTimelock(key, 2000)
        expect(a.toString('hex')).not.toBe(b.toString('hex'))
    })

    it('produces different secrets for different keys', () => {
        const key2 = Buffer.from('different-key-material-32-bytes!', 'utf8')
        const a = deriveSecretFromTimelock(key, 1000)
        const b = deriveSecretFromTimelock(key2, 1000)
        expect(a.toString('hex')).not.toBe(b.toString('hex'))
    })

    it('handles odd-length hex timelocks (normalizeHex padding)', () => {
        // timelock=15 → hex "f" → padded to "0f"
        // should not throw
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
        const secret = 'aabbccdd'
        const hashlock = secretToHashlock(secret)
        expect(hashlock).toMatch(/^0x[a-f0-9]{64}$/)
    })

    it('is deterministic', () => {
        const a = secretToHashlock('deadbeef')
        const b = secretToHashlock('deadbeef')
        expect(a).toBe(b)
    })

    it('handles 0x-prefixed input', () => {
        const withPrefix = secretToHashlock('0xdeadbeef')
        const withoutPrefix = secretToHashlock('deadbeef')
        expect(withPrefix).toBe(withoutPrefix)
    })

    it('produces different hashlocks for different secrets', () => {
        const a = secretToHashlock('aaaa')
        const b = secretToHashlock('bbbb')
        expect(a).not.toBe(b)
    })
})

describe('round-trip: secret → hashlock', () => {
    it('deriveSecretFromTimelock output can be hashed to a consistent hashlock', () => {
        const key = Buffer.from(IDENTITY_SALT, 'utf8')
        const secret = deriveSecretFromTimelock(key, 12345)
        const secretHex = secret.toString('hex')

        const hashlock1 = secretToHashlock(secretHex)
        const hashlock2 = secretToHashlock('0x' + secretHex)

        expect(hashlock1).toBe(hashlock2)
        expect(hashlock1).toMatch(/^0x[a-f0-9]{64}$/)
    })
})
