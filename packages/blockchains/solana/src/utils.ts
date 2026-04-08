export const encoder = new TextEncoder()
export const decoder = new TextDecoder()

export function hexToUint8Array(hex: string): Uint8Array {
    const clean = hex.replace('0x', '')
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
    }
    return bytes
}

export function uint8ArrayToHex(bytes: Uint8Array | number[]): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function writeBigUInt64LE(value: bigint): Uint8Array {
    const buf = new Uint8Array(8)
    const view = new DataView(buf.buffer)
    view.setBigUint64(0, value, true)
    return buf
}