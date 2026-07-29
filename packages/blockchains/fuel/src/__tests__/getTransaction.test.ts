import { TransactionStatus } from '@train-protocol/sdk'
import { describe, expect, it, vi } from 'vitest'
import type { Provider } from 'fuels'
import { getTransaction } from '../client/public/getTransaction'

describe('getTransaction', () => {
    it('performs one non-blocking query and maps a submitted transaction', async () => {
        const getTransactionWithReceipts = vi.fn().mockResolvedValue({
            transaction: {
                status: { type: 'SubmittedStatus' },
            },
        })
        const provider = {
            operations: { getTransactionWithReceipts },
        } as unknown as Provider

        await expect(getTransaction(provider, `0x${'12'.repeat(32)}`)).resolves.toEqual({
            hash: `0x${'12'.repeat(32)}`,
            status: TransactionStatus.Pending,
        })
        expect(getTransactionWithReceipts).toHaveBeenCalledOnce()
    })

    it.each([
        ['SuccessStatus', TransactionStatus.Confirmed],
        ['FailureStatus', TransactionStatus.Failed],
        ['PreconfirmationFailureStatus', TransactionStatus.Failed],
        ['SqueezedOutStatus', TransactionStatus.Failed],
    ])('maps %s to %s', async (type, expected) => {
        const provider = {
            operations: {
                getTransactionWithReceipts: vi.fn().mockResolvedValue({
                    transaction: { status: { type } },
                }),
            },
        } as unknown as Provider

        await expect(getTransaction(provider, `0x${'23'.repeat(32)}`)).resolves.toMatchObject({
            status: expected,
        })
    })

    it('returns null when the transaction is not indexed', async () => {
        const provider = {
            operations: {
                getTransactionWithReceipts: vi.fn().mockResolvedValue({
                    transaction: null,
                }),
            },
        } as unknown as Provider

        await expect(getTransaction(provider, `0x${'34'.repeat(32)}`)).resolves.toBeNull()
    })
})
