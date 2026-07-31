import { DateTime } from 'fuels'
import { describe, expect, it } from 'vitest'
import type { UserLockParams } from '@train-protocol/sdk'
import { buildUserLockArguments } from '../client/wallet/buildUserLockTx'
import type { FuelSigner } from '../types'

const CONTRACT = `0x${'10'.repeat(32)}`
const USER = `0x${'20'.repeat(32)}`
const SOLVER = `0x${'30'.repeat(32)}`
const ASSET_ID = `0x${'40'.repeat(32)}`
const PAYOUT_CURVE = `0x${'50'.repeat(32)}`

describe('Fuel transaction builders', () => {
    it('builds Fuel-native user-lock arguments with payable asset forwarding and TAI64 expiry', async () => {
        const params: UserLockParams = {
            sourceChain: 'fuel:0',
            destinationChain: 'eip155:11155111',
            amount: '1.5',
            destinationAmount: '5000000',
            sourceAsset: { symbol: 'USDC', contract: ASSET_ID, decimals: 6 },
            destinationAsset: {
                symbol: 'USDC',
                contract: '0x0000000000000000000000000000000000000001',
                decimals: 6,
            },
            srcSolverAddress: SOLVER,
            destSolverAddress: '0x0000000000000000000000000000000000000002',
            atomicContract: CONTRACT,
            sourceAddress: USER,
            destinationAddress: '0x0000000000000000000000000000000000000003',
            solverData: '0xabcd',
            payoutCurve: PAYOUT_CURVE,
            payoutCurveData: '0x1234',
            quoteExpiry: 2_000_000_000,
            rewardAmount: '10',
            rewardToken: 'USDC',
            rewardRecipient: 'recipient',
            rewardTimelockDelta: 300,
            timelockDelta: 3600,
            hashlock: `0x${'60'.repeat(32)}`,
            nonce: 123456,
        }
        const signer = {
            account: {
                provider: {
                    getBaseAssetId: async () => {
                        throw new Error('base asset lookup should not be needed')
                    },
                },
            },
        } as unknown as FuelSigner

        const result = await buildUserLockArguments(signer, params)

        expect(result.amount).toBe('1500000')
        expect(result.assetId).toBe(ASSET_ID)
        expect(result.lock.recipient).toEqual({ Address: { bits: SOLVER } })
        expect(result.lock.refund_to).toEqual({ Address: { bits: USER } })
        expect(result.lock.payout_curve).toEqual({ bits: PAYOUT_CURVE })
        expect([...result.lock.payout_curve_data!]).toEqual([0x12, 0x34])
        expect(result.lock.quote_expiry).toBe(DateTime.fromUnixSeconds(2_000_000_000).toTai64())
        expect(result.destination.dst_amount).toBe('5000000')
        expect([...result.solverData]).toEqual([0xab, 0xcd])
        expect(new TextDecoder().decode(result.userData)).toBe('123456')
    })
})
