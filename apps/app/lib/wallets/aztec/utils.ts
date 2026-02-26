/**
 * Convert a hex string (0x-prefixed or not) to a number[] byte array.
 * Used for hashlock (32 bytes) and secret (32 bytes).
 */
export function hexToBytes(hex: string, expectedLength: number): number[] {
    const clean = hex.replace(/^0x/i, '');
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 2) {
        bytes.push(parseInt(clean.substring(i, i + 2), 16));
    }
    if (bytes.length !== expectedLength) {
        throw new Error(`Expected ${expectedLength} bytes, got ${bytes.length}`);
    }
    return bytes;
}

/**
 * Convert a number[] byte array to a 0x-prefixed hex string.
 */
export function bytesToHex(bytes: (number | bigint)[]): string {
    return '0x' + bytes.map(b => Number(b).toString(16).padStart(2, '0')).join('');
}

/**
 * Convert a UTF-8 string to a fixed-length byte array, left-padded with spaces.
 * Used for srcChain (30), dstChain (30), dstAddress (90), dstToken (90), rewardRecipient (90).
 */
export function stringToBytes(str: string, length: number): number[] {
    const padded = str.padStart(length, ' ');
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(padded)).slice(0, length);
}
