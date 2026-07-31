import { describe, it, expect } from 'vitest'
import { Contract, RpcProvider } from 'starknet'
import abi from '../abis/STARKNET_HTLC.json' with { type: 'json' }
import { buildUserLockTx } from '../client/wallet/buildUserLockTx'
import { buildRefundTx } from '../client/wallet/buildRefundTx'
import { buildRedeemSolverTx } from '../client/wallet/buildRedeemSolverTx'
import { ZERO_ADDRESS } from '../constants'

// Deployed Train contract (Starknet Sepolia). Only used offline to build an ABI-aware
// Contract for `populate`, which is the source of truth for calldata ordering.
const CONTRACT = '0x4ae1ae0dd1dd01be306725ab8de15707241284c8dd49cbaf37bcf845bf2d20b'
const USER = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const SOLVER = '0x00abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef01'
const TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

const contract = () =>
    new Contract({ abi: abi as any, address: CONTRACT, providerOrAccount: new RpcProvider({ nodeUrl: 'http://offline' }) })
const felts = (cd: unknown) => (cd as string[]).map(v => BigInt(v))

const baseUserLockParams: any = {
    sourceChain: 'starknet-sepolia', destinationChain: 'ethereum-sepolia',
    amount: '1.5', destinationAmount: '1000000',
    sourceAsset: { contract: TOKEN, decimals: 18 },
    destinationAsset: { contract: '0x0000000000000000000000000000000000000000' },
    srcSolverAddress: SOLVER, atomicContract: CONTRACT, sourceAddress: USER,
    destinationAddress: '0x0000000000000000000000000000000000000001',
    payoutCurve: '', payoutCurveData: '0x', quoteExpiry: 1899999999,
    rewardToken: '', rewardRecipient: '', rewardTimelockDelta: 0,
    timelockDelta: 3600, hashlock: '0x1234abcd', nonce: 1721600000000,
}

describe('Starknet buildUserLockTx', () => {
    it('serializes UserLockParams in the exact new contract order (no sender; refund_to/payout_curve/payout_curve_data)', () => {
        const built = felts(buildUserLockTx(baseUserLockParams).calldata)
        // ABI-driven reference: pass raw values, let populate encode per the deployed ABI.
        const ref = felts(contract().populate('user_lock', [
            { hashlock: 0x1234abcdn, amount: 1500000000000000000n, reward_amount: 0n,
              timelock_delta: 3600, reward_timelock_delta: 0, quote_expiry: 1899999999,
              recipient: SOLVER, token: TOKEN, reward_token: '', reward_recipient: '',
              src_chain: 'starknet-sepolia', refund_to: USER, payout_curve: ZERO_ADDRESS, payout_curve_data: '' },
            { dst_chain: 'ethereum-sepolia', dst_address: '0x0000000000000000000000000000000000000001',
              dst_amount: 1000000n, dst_token: '0x0000000000000000000000000000000000000000' },
            String(1721600000000), '',
        ]).calldata)
        // UserLockParams + dst_chain occupy the first 28 felts; the dst_address/dst_token
        // ByteArrays use the app's byteArrayFromString convention (unchanged) so compare the
        // struct this change owns.
        expect(built.slice(0, 28)).toEqual(ref.slice(0, 28))
    })

    it('defaults payout_curve to ZERO_ADDRESS and refund_to to the user when no curve is set', () => {
        const built = buildUserLockTx(baseUserLockParams)
        expect(built.entrypoint).toBe('user_lock')
        // felt 21 is payout_curve (see layout above) → 0 when no curve
        expect(felts(built.calldata)[21]).toBe(0n)
    })

    it('passes a provided payout curve through', () => {
        const curve = '0x27e92c85cf5da7861549ceba60096737a773f9b94f49046604ff0a0035cc351'
        const built = felts(buildUserLockTx({ ...baseUserLockParams, payoutCurve: curve }).calldata)
        expect(built[21]).toBe(BigInt(curve))
    })
})

describe('Starknet buildRefundTx', () => {
    it('matches refund_user(hashlock) ABI encoding', () => {
        const built = felts(buildRefundTx({ contractAddress: CONTRACT, id: '0x1234abcd' } as any).calldata)
        const ref = felts(contract().populate('refund_user', [0x1234abcdn]).calldata)
        expect(built).toEqual(ref)
    })
})

describe('Starknet buildRedeemSolverTx', () => {
    it('matches redeem_solver(hashlock, index, secret) ABI encoding', () => {
        const built = felts(buildRedeemSolverTx({ contractAddress: CONTRACT, id: '0x1234abcd', index: 2, secret: '0xdeadbeef' } as any).calldata)
        const ref = felts(contract().populate('redeem_solver', [0x1234abcdn, 2n, 0xdeadbeefn]).calldata)
        expect(built).toEqual(ref)
    })

    it('defaults index to 1 when omitted', () => {
        const built = felts(buildRedeemSolverTx({ contractAddress: CONTRACT, id: '0x1234abcd', secret: '0xdeadbeef' } as any).calldata)
        const ref = felts(contract().populate('redeem_solver', [0x1234abcdn, 1n, 0xdeadbeefn]).calldata)
        expect(built).toEqual(ref)
    })
})
