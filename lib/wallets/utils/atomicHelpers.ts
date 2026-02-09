export interface GenerateRandomIdOptions {
    /** Number of random bytes to generate (default: 32) */
    bytes?: number
    /** Prefix to add before the random hex (e.g., '0000' for EVM 30-byte IDs) */
    prefix?: string
    /** Whether to include '0x' prefix (default: true) */
    withHexPrefix?: boolean
    /** Return as BigInt instead of string */
    asBigInt?: boolean
}

/**
 * Generate random hex string for commitment IDs
 *
 * @example
 * // Standard 32-byte hex with 0x prefix
 * generateRandomId() // "0x1a2b3c..."
 *
 * @example
 * // EVM-style 30-byte with 0000 prefix
 * generateRandomId({ bytes: 30, prefix: '0000' }) // "0x00001a2b3c..."
 *
 * @example
 * // As BigInt for Fuel
 * generateRandomId({ asBigInt: true }) // BigInt
 */
export function generateRandomId(options?: GenerateRandomIdOptions): string | bigint {
    const {
        bytes = 32,
        prefix = '',
        withHexPrefix = true,
        asBigInt = false
    } = options ?? {}

    const randomBytes = new Uint8Array(bytes)
    crypto.getRandomValues(randomBytes)

    const hex = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

    const fullHex = prefix + hex

    if (asBigInt) {
        return BigInt('0x' + fullHex)
    }

    return withHexPrefix ? '0x' + fullHex : fullHex
}

/**
 * Convert byte array to hex string (without 0x prefix)
 *
 * @example
 * toHexString([255, 0, 128]) // "ff0080"
 */
export function toHexString(byteArray: Uint8Array | number[] | any): string {
    return Array.from(byteArray, (byte: any) =>
        ('0' + (byte & 0xFF).toString(16)).slice(-2)
    ).join('')
}

/**
 * Assert wallet is connected, throws error if not
 * TypeScript type guard that narrows the type
 *
 * @example
 * assertWalletConnected(wallet) // throws if wallet is null/undefined
 * // After this line, wallet is guaranteed to be non-null
 */
export function assertWalletConnected<T>(
    wallet: T | null | undefined,
    message: string = 'Wallet not connected'
): asserts wallet is T {
    if (!wallet) {
        throw new Error(message)
    }
}
