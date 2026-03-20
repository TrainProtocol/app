import { TrainError, TrainErrorCode } from './errors'

/** Convert a human-readable amount to its smallest unit (e.g. '1.5' with 18 decimals → 1500000000000000000n) */
export function parseUnits(value: string, decimals: number) {
    if (!/^(-?)([0-9]*)\.?([0-9]*)$/.test(value))
        throw new TrainError(TrainErrorCode.INVALID_INPUT, `Invalid decimal number: ${value}`)

    let [integer, fraction = '0'] = value.split('.')

    const negative = integer.startsWith('-')
    if (negative) integer = integer.slice(1)

    // trim trailing zeros.
    fraction = fraction.replace(/(0+)$/, '')

    // round off if the fraction is larger than the number of decimals.
    if (decimals === 0) {
        if (Math.round(Number(`.${fraction}`)) === 1)
            integer = `${BigInt(integer) + 1n}`
        fraction = ''
    } else if (fraction.length > decimals) {
        const [left, unit, right] = [
            fraction.slice(0, decimals - 1),
            fraction.slice(decimals - 1, decimals),
            fraction.slice(decimals),
        ]

        const rounded = Math.round(Number(`${unit}.${right}`))
        if (rounded > 9)
            fraction = `${BigInt(left) + BigInt(1)}0`.padStart(left.length + 1, '0')
        else fraction = `${left}${rounded}`

        if (fraction.length > decimals) {
            fraction = fraction.slice(1)
            integer = `${BigInt(integer) + 1n}`
        }

        fraction = fraction.slice(0, decimals)
    } else {
        fraction = fraction.padEnd(decimals, '0')
    }

    return BigInt(`${negative ? '-' : ''}${integer}${fraction}`)
}

/** Convert from smallest unit to human-readable (e.g. 1500000000000000000n with 18 decimals → '1.5') */
export function formatUnits(value: bigint, decimals: number) {
    let display = value.toString()

    const negative = display.startsWith('-')
    if (negative) display = display.slice(1)

    display = display.padStart(decimals, '0')

    let [integer, fraction] = [
        display.slice(0, display.length - decimals),
        display.slice(display.length - decimals),
    ]
    fraction = fraction.replace(/(0+)$/, '')
    return `${negative ? '-' : ''}${integer || '0'}${fraction ? `.${fraction}` : ''}`
}

/** Convert a hex string (0x-prefixed or not) to a number[] byte array */
export function hexToBytes(hex: string, expectedLength: number): number[] {
    const clean = hex.replace(/^0x/i, '')
    const bytes: number[] = []
    for (let i = 0; i < clean.length; i += 2) {
        bytes.push(parseInt(clean.substring(i, i + 2), 16))
    }
    if (bytes.length !== expectedLength) {
        throw new TrainError(TrainErrorCode.INVALID_INPUT, `Expected ${expectedLength} bytes, got ${bytes.length}`)
    }
    return bytes
}

/** Convert a number[] byte array to a 0x-prefixed hex string */
export function bytesToHex(bytes: (number | bigint)[]): string {
    return '0x' + bytes.map(b => Number(b).toString(16).padStart(2, '0')).join('')
}

/** Convert a bigint to a 0x-prefixed 32-byte hex string */
export function toHex32(value: bigint): string {
    return ('0x' + value.toString(16).padStart(64, '0')) as string
}