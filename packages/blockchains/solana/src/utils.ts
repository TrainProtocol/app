export function secretToBuffer(secret: string | bigint): Buffer {
    if (typeof secret === 'bigint') {
        const hex = secret.toString(16).padStart(64, '0')
        return Buffer.from(hex, 'hex')
    }
    return Buffer.from(secret.replace('0x', ''), 'hex')
}
