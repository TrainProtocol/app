/**
 * Convert a UTF-8 string to a fixed-length byte array, left-padded with spaces.
 */
export function stringToBytes(str: string, length: number): number[] {
    const padded = str.padStart(length, ' ')
    const encoder = new TextEncoder()
    return Array.from(encoder.encode(padded)).slice(0, length)
}
