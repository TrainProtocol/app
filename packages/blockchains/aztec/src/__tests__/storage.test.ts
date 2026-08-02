import { Fr } from '@aztec/aztec.js/fields'
import type { AztecNode } from '@aztec/aztec.js/node'
import { describe, expect, it, vi } from 'vitest'
import { TrainContract } from '../artifacts/Train'

vi.mock('@aztec/stdlib/hash', async () => {
    const { Fr: MockFr } = await import('@aztec/aztec.js/fields')
    return {
        deriveStorageSlotInMap: async (slot: Fr, key: { toField(): Fr }) =>
            new MockFr(slot.toBigInt() + key.toField().toBigInt()),
    }
})

import {
    decodeSolverLockFields,
    hashlockToFields,
    readSolverLock,
    TRAIN_STORAGE_SLOTS,
} from '../client/public/storage'

const contractAddress = `0x${'01'.padStart(64, '0')}`
const hashlock = `0x${'11'.repeat(16)}${'22'.repeat(16)}`
const solverAddress = `0x${'02'.padStart(64, '0')}`

describe('Aztec public storage layout', () => {
    it('matches the generated Train artifact root slots', () => {
        const layouts = (TrainContract.artifact as any).outputs.globals.storage
        const trainLayout = layouts.find((layout: any) =>
            layout.fields.find((field: any) =>
                field.name === 'contract_name' && field.value.value === 'Train',
            ),
        )
        const fields = trainLayout.fields.find((field: any) => field.name === 'fields').value.fields
        const slot = (name: string) => BigInt(`0x${
            fields.find((field: any) => field.name === name).value.fields[0].value.value
        }`)

        expect(TRAIN_STORAGE_SLOTS).toEqual({
            userLocks: slot('user_locks'),
            solverLocks: slot('solver_locks'),
        })
    })

    it('splits hashlocks into the two big-endian u128 map keys', () => {
        const [high, low] = hashlockToFields(hashlock)

        expect(high.toBigInt()).toBe(BigInt(`0x${'11'.repeat(16)}`))
        expect(low.toBigInt()).toBe(BigInt(`0x${'22'.repeat(16)}`))
        expect(() => hashlockToFields('0x1234')).toThrow('Invalid hashlock format')
    })

    it('reads and decodes all 20 packed solver-lock fields', async () => {
        let firstSlot: bigint | undefined
        const getPublicStorageAt = vi.fn((
            _block: unknown,
            _contract: unknown,
            slot: Fr,
        ) => {
            firstSlot ??= slot.toBigInt()
            return Promise.resolve(new Fr(slot.toBigInt() - firstSlot + 1n))
        })
        const node = { getPublicStorageAt } as unknown as AztecNode

        const result = await readSolverLock(node, contractAddress, hashlock, solverAddress)

        expect(getPublicStorageAt).toHaveBeenCalledTimes(20)
        expect(result.sender.toBigInt()).toBe(3n)
        expect(result.amount).toBe(4n)
        expect(result.reward).toBe(5n)
        expect(result.refund_to.toBigInt()).toBe(6n)
        expect(result.status).toBe(11n)
        expect(result.reward_token.toBigInt()).toBe(14n)
        expect([
            result.payout_curve_data[30],
            result.payout_curve_data[61],
            result.payout_curve_data[92],
            result.payout_curve_data[123],
            result.payout_curve_data[127],
        ]).toEqual([16, 17, 18, 19, 20])
    })

    it('rejects truncated packed lock data', () => {
        expect(() => decodeSolverLockFields([new Fr(0)])).toThrow(
            'Invalid solver lock field count: 1',
        )
    })
})
