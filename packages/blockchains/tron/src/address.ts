import { sha256 } from '@noble/hashes/sha256'
import { TRON_ADDRESS_PREFIX } from './constants.js'

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE = 58

function encodeBase58(bytes: Uint8Array): string {
    const digits = [0]
    for (const byte of bytes) {
        let carry = byte
        for (let j = 0; j < digits.length; j++) {
            carry += digits[j] << 8
            digits[j] = carry % BASE
            carry = (carry / BASE) | 0
        }
        while (carry > 0) {
            digits.push(carry % BASE)
            carry = (carry / BASE) | 0
        }
    }
    let result = ''
    for (const byte of bytes) {
        if (byte !== 0) break
        result += ALPHABET[0]
    }
    for (let i = digits.length - 1; i >= 0; i--) {
        result += ALPHABET[digits[i]]
    }
    return result
}

function decodeBase58(str: string): Uint8Array {
    const bytes = [0]
    for (const char of str) {
        const value = ALPHABET.indexOf(char)
        if (value < 0) throw new Error(`Invalid Base58 character: ${char}`)
        let carry = value
        for (let j = 0; j < bytes.length; j++) {
            carry += bytes[j] * BASE
            bytes[j] = carry & 0xff
            carry >>= 8
        }
        while (carry > 0) {
            bytes.push(carry & 0xff)
            carry >>= 8
        }
    }
    let leadingZeros = 0
    for (const char of str) {
        if (char !== ALPHABET[0]) break
        leadingZeros++
    }
    const result = new Uint8Array(leadingZeros + bytes.length)
    for (let i = 0; i < leadingZeros; i++) result[i] = 0
    for (let i = 0; i < bytes.length; i++) result[leadingZeros + i] = bytes[bytes.length - 1 - i]
    return result
}

function checksum(payload: Uint8Array): Uint8Array {
    return sha256(sha256(payload)).slice(0, 4)
}

/** Convert Base58Check Tron address (T-prefix) to 41-prefixed hex */
export function base58ToHex(base58Address: string): string {
    const decoded = decodeBase58(base58Address)
    const payload = decoded.slice(0, decoded.length - 4)
    const cs = decoded.slice(decoded.length - 4)
    const expected = checksum(payload)
    for (let i = 0; i < 4; i++) {
        if (cs[i] !== expected[i]) throw new Error('Invalid Base58Check checksum')
    }
    return Array.from(payload).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Convert 41-prefixed hex to Base58Check Tron address */
export function hexToBase58(hexAddress: string): string {
    const clean = hexAddress.startsWith('0x') ? hexAddress.slice(2) : hexAddress
    const payload = new Uint8Array(clean.length / 2)
    for (let i = 0; i < payload.length; i++) {
        payload[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16)
    }
    const cs = checksum(payload)
    const full = new Uint8Array(payload.length + 4)
    full.set(payload)
    full.set(cs, payload.length)
    return encodeBase58(full)
}

/** Convert Base58Check Tron address to 0x-prefixed 20-byte EVM hex (for ABI encoding) */
export function base58ToEvmHex(base58Address: string): string {
    const hex41 = base58ToHex(base58Address)
    // Strip the 41 prefix to get 20-byte address
    return '0x' + hex41.slice(2)
}

/** Convert 0x-prefixed 20-byte EVM hex to Base58Check Tron address */
export function evmHexToBase58(evmHex: string): string {
    const clean = evmHex.startsWith('0x') ? evmHex.slice(2) : evmHex
    return hexToBase58(TRON_ADDRESS_PREFIX.toString(16) + clean)
}

/** Check if a string is a valid Base58Check Tron address */
export function isBase58Address(address: string): boolean {
    try {
        if (!address.startsWith('T')) return false
        base58ToHex(address)
        return true
    } catch {
        return false
    }
}

/** Normalize an address to 0x-prefixed EVM hex. Accepts Base58 or hex formats. */
export function toEvmHex(address: string): `0x${string}` {
    if (address.startsWith('T')) {
        return base58ToEvmHex(address) as `0x${string}`
    }
    if (address.startsWith('41') && address.length === 42 && !address.startsWith('0x')) {
        return ('0x' + address.slice(2)) as `0x${string}`
    }
    if (address.startsWith('0x')) {
        return address as `0x${string}`
    }
    return ('0x' + address) as `0x${string}`
}

/** Normalize an address to 41-prefixed hex for TronGrid API. Accepts Base58 or hex formats. */
export function toTronHex(address: string): string {
    if (address.startsWith('T')) {
        return base58ToHex(address)
    }
    if (address.startsWith('0x')) {
        return TRON_ADDRESS_PREFIX.toString(16) + address.slice(2)
    }
    if (address.startsWith('41') && address.length === 42) {
        return address
    }
    return TRON_ADDRESS_PREFIX.toString(16) + address
}
