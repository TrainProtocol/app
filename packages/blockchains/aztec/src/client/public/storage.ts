import { AztecAddress } from '@aztec/aztec.js/addresses'
import { Fr } from '@aztec/aztec.js/fields'
import type { AztecNode } from '@aztec/aztec.js/node'
import { deriveStorageSlotInMap } from '@aztec/stdlib/hash'

// Generated Train artifact storage layout. PublicMutable stores each packed
// field directly in consecutive public-storage slots.
export const TRAIN_STORAGE_SLOTS = {
    userLocks: 1n,
    solverLocks: 2n,
} as const

const USER_LOCK_FIELD_COUNT = 16
const SOLVER_LOCK_FIELD_COUNT = 20
export type ReferenceBlock = Parameters<AztecNode['getPublicStorageAt']>[0]

export interface StoredUserLock {
    secret: number[]
    sender: AztecAddress
    amount: bigint
    refund_to: AztecAddress
    timelock: bigint
    start_time: bigint
    status: bigint
    recipient: AztecAddress
    token: AztecAddress
    payout_curve: AztecAddress
    payout_curve_data: number[]
}

export interface StoredSolverLock extends StoredUserLock {
    reward: bigint
    reward_timelock: bigint
    reward_recipient: AztecAddress
    reward_token: AztecAddress
}

export function hashlockToFields(hashlock: string): [Fr, Fr] {
    const value = hashlock.startsWith('0x') ? hashlock.slice(2) : hashlock
    if (!/^[0-9a-fA-F]{64}$/.test(value)) {
        throw new Error('Invalid hashlock format')
    }

    return [
        new Fr(BigInt(`0x${value.slice(0, 32)}`)),
        new Fr(BigInt(`0x${value.slice(32)}`)),
    ]
}

async function deriveNestedMapSlot(root: bigint, keys: (Fr | AztecAddress)[]): Promise<Fr> {
    let slot = new Fr(root)
    for (const key of keys) {
        slot = await deriveStorageSlotInMap(slot, key)
    }
    return slot
}

async function readPackedFields(
    node: AztecNode,
    contractAddress: AztecAddress,
    startSlot: Fr,
    fieldCount: number,
    referenceBlock: ReferenceBlock,
): Promise<Fr[]> {
    return Promise.all(Array.from({ length: fieldCount }, (_, offset) =>
        node.getPublicStorageAt(
            referenceBlock,
            contractAddress,
            startSlot.add(new Fr(offset)),
        ),
    ))
}

function limbsToBytes32(high: Fr, low: Fr): number[] {
    const result = new Array<number>(32).fill(0)
    let highValue = high.toBigInt()
    let lowValue = low.toBigInt()

    for (let index = 15; index >= 0; index--) {
        result[index] = Number(highValue & 0xffn)
        result[index + 16] = Number(lowValue & 0xffn)
        highValue >>= 8n
        lowValue >>= 8n
    }

    return result
}

const addressFromField = (field: Fr) => AztecAddress.fromFieldUnsafe(field)

function fieldToFixedBytes(field: Fr, length: number): number[] {
    const bytes = new Array<number>(length).fill(0)
    let value = field.toBigInt()
    for (let index = length - 1; index >= 0; index--) {
        bytes[index] = Number(value & 0xffn)
        value >>= 8n
    }
    return bytes
}

function fieldsToBytes128(fields: Fr[]): number[] {
    if (fields.length !== 5) throw new Error(`Invalid payout curve data field count: ${fields.length}`)
    return [
        ...fieldToFixedBytes(fields[0], 31),
        ...fieldToFixedBytes(fields[1], 31),
        ...fieldToFixedBytes(fields[2], 31),
        ...fieldToFixedBytes(fields[3], 31),
        ...fieldToFixedBytes(fields[4], 4),
    ]
}

export function decodeUserLockFields(fields: Fr[]): StoredUserLock {
    if (fields.length !== USER_LOCK_FIELD_COUNT) {
        throw new Error(`Invalid user lock field count: ${fields.length}`)
    }

    return {
        secret: limbsToBytes32(fields[0], fields[1]),
        sender: addressFromField(fields[2]),
        amount: fields[3].toBigInt(),
        refund_to: addressFromField(fields[4]),
        timelock: fields[5].toBigInt(),
        start_time: fields[6].toBigInt(),
        status: fields[7].toBigInt(),
        recipient: addressFromField(fields[8]),
        token: addressFromField(fields[9]),
        payout_curve: addressFromField(fields[10]),
        payout_curve_data: fieldsToBytes128(fields.slice(11, 16)),
    }
}

export function decodeSolverLockFields(fields: Fr[]): StoredSolverLock {
    if (fields.length !== SOLVER_LOCK_FIELD_COUNT) {
        throw new Error(`Invalid solver lock field count: ${fields.length}`)
    }

    return {
        secret: limbsToBytes32(fields[0], fields[1]),
        sender: addressFromField(fields[2]),
        amount: fields[3].toBigInt(),
        reward: fields[4].toBigInt(),
        refund_to: addressFromField(fields[5]),
        timelock: fields[6].toBigInt(),
        reward_timelock: fields[7].toBigInt(),
        start_time: fields[8].toBigInt(),
        recipient: addressFromField(fields[9]),
        status: fields[10].toBigInt(),
        reward_recipient: addressFromField(fields[11]),
        token: addressFromField(fields[12]),
        reward_token: addressFromField(fields[13]),
        payout_curve: addressFromField(fields[14]),
        payout_curve_data: fieldsToBytes128(fields.slice(15, 20)),
    }
}

export async function readUserLock(
    node: AztecNode,
    contractAddress: string,
    hashlock: string,
    referenceBlock: ReferenceBlock = 'latest',
): Promise<StoredUserLock> {
    const address = AztecAddress.fromStringUnsafe(contractAddress)
    const slot = await deriveNestedMapSlot(
        TRAIN_STORAGE_SLOTS.userLocks,
        hashlockToFields(hashlock),
    )
    const fields = await readPackedFields(
        node,
        address,
        slot,
        USER_LOCK_FIELD_COUNT,
        referenceBlock,
    )
    return decodeUserLockFields(fields)
}

export async function readSolverLock(
    node: AztecNode,
    contractAddress: string,
    hashlock: string,
    solverAddress: string,
    referenceBlock: ReferenceBlock = 'latest',
): Promise<StoredSolverLock> {
    const address = AztecAddress.fromStringUnsafe(contractAddress)
    const slot = await deriveNestedMapSlot(
        TRAIN_STORAGE_SLOTS.solverLocks,
        [...hashlockToFields(hashlock), AztecAddress.fromStringUnsafe(solverAddress)],
    )
    const fields = await readPackedFields(
        node,
        address,
        slot,
        SOLVER_LOCK_FIELD_COUNT,
        referenceBlock,
    )
    return decodeSolverLockFields(fields)
}
