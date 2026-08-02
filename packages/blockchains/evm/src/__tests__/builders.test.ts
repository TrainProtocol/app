import { describe, it, expect } from 'vitest'
import { AbiFunction } from 'ox'
import type { UserLockParams, RefundParams, RedeemSolverParams, Token } from '@train-protocol/sdk'
import { buildUserLockTx } from '../client/wallet/buildUserLockTx'
import { buildRefundTx } from '../client/wallet/buildRefundTx'
import { buildRedeemSolverTx } from '../client/wallet/buildRedeemSolverTx'
import { buildApproveTx } from '../client/wallet/buildApproveTx'
import { htlcFunctions, erc20Functions } from '../abi'
import { ZERO_ADDRESS } from '../constants'

const hashlock = '0x' + 'ab'.repeat(32)
const atomicContract = '0x1111111111111111111111111111111111111111'
const sourceAddress = '0x2222222222222222222222222222222222222222'
const srcSolverAddress = '0x3333333333333333333333333333333333333333'
const erc20Token = '0x4444444444444444444444444444444444444444'
const payoutCurve = '0xa46966484b1eb2c650333db72de07f667df76765'

const nativeAsset = { symbol: 'ETH', contract: ZERO_ADDRESS, decimals: 18 } as unknown as Token
const erc20Asset = { symbol: 'USDC', contract: erc20Token, decimals: 6 } as unknown as Token
const destinationAsset = {
    symbol: 'USDC',
    contract: '0x5555555555555555555555555555555555555555',
    decimals: 6,
} as unknown as Token

function makeUserLockParams(overrides: Partial<UserLockParams> = {}): UserLockParams {
    return {
        sourceChain: 'eip155:11155111',
        destinationChain: 'eip155:84532',
        amount: '1.5',
        destinationAmount: '1500000',
        sourceAsset: nativeAsset,
        destinationAsset,
        srcSolverAddress,
        destSolverAddress: srcSolverAddress,
        atomicContract,
        sourceAddress,
        destinationAddress: sourceAddress,
        payoutCurve,
        payoutCurveData: '0x1234',
        quoteExpiry: 1700000000,
        timelockDelta: 3600,
        hashlock,
        nonce: 1700000000000,
        ...overrides,
    }
}

describe('buildUserLockTx', () => {
    it('returns native value for native asset and decodes via userLock ABI', () => {
        const tx = buildUserLockTx(makeUserLockParams())

        expect(tx.to).toBe(atomicContract)
        expect(tx.value).toBe(1500000000000000000n) // 1.5 ETH in wei
        const [lockParams] = AbiFunction.decodeData(
            htlcFunctions.userLock,
            tx.data as `0x${string}`,
        ) as readonly [{
            readonly payoutCurve: `0x${string}`
            readonly payoutCurveData: `0x${string}`
        }]
        expect(lockParams.payoutCurve).toBe(payoutCurve)
        expect(lockParams.payoutCurveData).toBe('0x1234')
    })

    it('omits value for ERC20 source asset', () => {
        const tx = buildUserLockTx(makeUserLockParams({ sourceAsset: erc20Asset, amount: '10' }))

        expect(tx.value).toBeUndefined()
        expect(() =>
            AbiFunction.decodeData(htlcFunctions.userLock, tx.data as `0x${string}`),
        ).not.toThrow()
    })

    it('is deterministic for identical params', () => {
        const a = buildUserLockTx(makeUserLockParams())
        const b = buildUserLockTx(makeUserLockParams())
        expect(a).toEqual(b)
    })

    it('uses the zero address when the quote has no payout curve', () => {
        const tx = buildUserLockTx(makeUserLockParams({ payoutCurve: '' }))
        const [lockParams] = AbiFunction.decodeData(
            htlcFunctions.userLock,
            tx.data as `0x${string}`,
        ) as readonly [{ readonly payoutCurve: `0x${string}` }]

        expect(lockParams.payoutCurve).toBe(ZERO_ADDRESS)
    })

    it('encodes empty config when the quote omits payoutCurveData', () => {
        const tx = buildUserLockTx(makeUserLockParams({ payoutCurveData: undefined }))
        const [lockParams] = AbiFunction.decodeData(
            htlcFunctions.userLock,
            tx.data as `0x${string}`,
        ) as readonly [{ readonly payoutCurveData: `0x${string}` }]

        expect(lockParams.payoutCurveData).toBe('0x')
    })
})

describe('buildRefundTx', () => {
    it('encodes refundUser with the lock id', () => {
        const params: RefundParams = {
            chainId: null,
            contractAddress: atomicContract,
            id: hashlock,
            sourceAsset: nativeAsset,
        }
        const tx = buildRefundTx(params)

        expect(tx.to).toBe(atomicContract)
        expect(tx.value).toBeUndefined()

        const decoded = AbiFunction.decodeData(
            htlcFunctions.refundUser,
            tx.data as `0x${string}`,
        ) as readonly [`0x${string}`]
        expect(decoded[0]).toBe(hashlock)
    })
})

describe('buildRedeemSolverTx', () => {
    it('encodes redeemSolver with id, solver, and secret as bigint', () => {
        const secret = '0x' + '12'.repeat(32)
        const solverAddress = '0x1111111111111111111111111111111111111111'
        const params: RedeemSolverParams = {
            chainId: null,
            contractAddress: atomicContract,
            id: hashlock,
            secret,
            sourceAsset: nativeAsset,
            destinationAddress: sourceAddress,
            destinationAsset,
            solverAddress,
        }
        const tx = buildRedeemSolverTx(params)

        expect(tx.to).toBe(atomicContract)

        const decoded = AbiFunction.decodeData(
            htlcFunctions.redeemSolver,
            tx.data as `0x${string}`,
        ) as readonly [`0x${string}`, `0x${string}`, bigint]
        expect(decoded[0]).toBe(hashlock)
        expect(decoded[1]).toBe(solverAddress)
        expect(decoded[2]).toBe(BigInt(secret))
    })
})

describe('buildApproveTx', () => {
    it('encodes approve(spender, amount) on the token contract', () => {
        const tx = buildApproveTx({
            token: erc20Token,
            spender: atomicContract,
            amount: 1_000_000n,
        })

        expect(tx.to).toBe(erc20Token)
        expect(tx.value).toBeUndefined()

        const decoded = AbiFunction.decodeData(
            erc20Functions.approve,
            tx.data as `0x${string}`,
        ) as readonly [`0x${string}`, bigint]
        expect(decoded[0].toLowerCase()).toBe(atomicContract.toLowerCase())
        expect(decoded[1]).toBe(1_000_000n)
    })
})
