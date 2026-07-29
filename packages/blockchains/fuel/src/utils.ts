import { Address, DateTime } from 'fuels'
import { hexToBytes } from '@train-protocol/sdk'
import type { Bytes } from 'fuels'
import type { FuelIdentity, FuelLockStatus } from './types.js'
import { LockStatus } from '@train-protocol/sdk'

const ZERO_B256 = `0x${'0'.repeat(64)}`

export function normalizeB256(value: string): string {
    return Address.fromAddressOrString(value).toB256()
}

export function identityFromAddress(value: string): FuelIdentity {
    return { Address: { bits: normalizeB256(value) } }
}

export function identityToAddress(identity: FuelIdentity | null | undefined): string {
    if (!identity) return ''
    if ('Address' in identity) return identity.Address.bits
    if ('ContractId' in identity) return identity.ContractId.bits
    return ''
}

export function optionalContractId(value?: string | null): { bits: string } | undefined {
    if (!value || /^0x0+$/i.test(value)) return undefined
    const bits = normalizeB256(value)
    return bits.toLowerCase() === ZERO_B256 ? undefined : { bits }
}

export function optionalContractIdToString(value?: { bits: string } | null): string | undefined {
    return value?.bits && value.bits.toLowerCase() !== ZERO_B256 ? value.bits : undefined
}

export function unixSecondsToTai64(unixSeconds: number): string {
    return DateTime.fromUnixSeconds(unixSeconds).toTai64()
}

export function tai64ToUnixSeconds(tai64: { toString(): string } | string | number): number {
    return DateTime.fromTai64(tai64.toString()).toUnixSeconds()
}

export function mapFuelLockStatus(status: FuelLockStatus | number): LockStatus {
    if (typeof status === 'number') return status as LockStatus
    switch (status) {
        case 'Pending': return LockStatus.Pending
        case 'Refunded': return LockStatus.Refunded
        case 'Redeemed': return LockStatus.Redeemed
        default: return LockStatus.Empty
    }
}

export function dataBytes(value?: string): Uint8Array {
    if (!value) return new Uint8Array()
    return /^0x(?:[0-9a-f]{2})*$/i.test(value)
        ? Uint8Array.from(hexToBytes(value, value.replace(/^0x/i, '').length / 2))
        : new TextEncoder().encode(value)
}

export function decodeBytes(value?: Bytes): string | undefined {
    if (!value) return undefined
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value as number[])
    if (!bytes.length) return undefined
    return new TextDecoder().decode(bytes).replace(/\0/g, '').trim() || undefined
}

export function isFuelTxHash(value: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(value)
}
