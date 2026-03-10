import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import {
    SAMPLE_ADDRESS,
    SAMPLE_LP_ADDRESS,
    SAMPLE_CONTRACT,
    SAMPLE_TOKEN,
    SAMPLE_HASHLOCK,
    SAMPLE_TX_HASH,
    createMockSigner,
    createMockApiClient,
} from './helpers.js'

// Create mock contract instance
const mockContract = {
    populate: vi.fn().mockReturnValue({ calldata: [] }),
    invoke: vi.fn().mockResolvedValue({ transaction_hash: SAMPLE_TX_HASH }),
    get_user_lock: vi.fn().mockResolvedValue({}),
    get_solver_lock: vi.fn().mockResolvedValue({}),
    get_solver_lock_count: vi.fn().mockResolvedValue(0n),
}

vi.mock('starknet', () => ({
    Contract: class {
        constructor() { return mockContract }
    },
    RpcProvider: class {
        constructor() {}
    },
    cairo: {
        uint256: vi.fn((v: unknown) => v),
    },
}))

// Mock ABIs
vi.mock('../abis/STARKNET_HTLC.json', () => ({ default: [] }))
vi.mock('../abis/ERC20.js', () => ({ ERC20_ABI: [] }))

import { StarknetHTLCClient } from '../client.js'

function createClient(opts?: { withSigner?: boolean }) {
    const signer = opts?.withSigner !== false ? createMockSigner() : undefined
    return {
        client: new StarknetHTLCClient({
            rpcUrl: 'https://starknet.example.com',
            apiClient: createMockApiClient(),
            signer: signer as any,
        }),
        signer,
    }
}

describe('StarknetHTLCClient', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        // Re-set defaults
        mockContract.populate.mockReturnValue({ calldata: [] })
        mockContract.invoke.mockResolvedValue({ transaction_hash: SAMPLE_TX_HASH })
        mockContract.get_user_lock.mockResolvedValue({})
        mockContract.get_solver_lock.mockResolvedValue({})
        mockContract.get_solver_lock_count.mockResolvedValue(0n)
    })

    describe('userLock', () => {
        const params = {
            destinationChain: 'eip155:1',
            sourceChain: 'starknet:SN_SEPOLIA',
            amount: '1.0',
            destinationAmount: '1000000000000000000',
            decimals: 18,
            destinationAsset: '0xdsttoken',
            sourceAsset: { contractAddress: SAMPLE_TOKEN, symbol: 'ETH', decimals: 18 },
            destLpAddress: SAMPLE_LP_ADDRESS,
            srcLpAddress: SAMPLE_LP_ADDRESS,
            atomicContract: SAMPLE_CONTRACT,
            sourceAddress: SAMPLE_ADDRESS,
            destinationAddress: '0xdestaddr',
            hashlock: SAMPLE_HASHLOCK,
            nonce: 1700000000000,
            quoteExpiry: 1700001000,
            timelockDelta: 150,
        } as any

        it('executes multicall with approve + userLock and returns result', async () => {
            const { client, signer } = createClient()

            const result = await client.userLock(params)

            expect(signer!.account.execute).toHaveBeenCalledWith(
                expect.arrayContaining([expect.anything(), expect.anything()])
            )
            expect(signer!.account.waitForTransaction).toHaveBeenCalledWith(SAMPLE_TX_HASH)
            expect(result.hash).toBe(SAMPLE_TX_HASH)
            expect(result.hashlock).toBe(SAMPLE_HASHLOCK)
            expect(result.nonce).toBe(1700000000000)
        })

        it('throws when no signer configured', async () => {
            const { client } = createClient({ withSigner: false })
            await expect(client.userLock(params)).rejects.toThrow('Signer required')
        })

        it('propagates execution errors', async () => {
            const { client, signer } = createClient()
            signer!.account.execute.mockRejectedValueOnce(new Error('insufficient funds'))

            await expect(client.userLock(params)).rejects.toThrow('insufficient funds')
        })
    })

    describe('refund', () => {
        const params = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            type: 'erc20' as const,
            chainId: 'SN_SEPOLIA',
            sourceAsset: { contractAddress: SAMPLE_TOKEN, symbol: 'ETH', decimals: 18 },
        }

        it('invokes refund_user and returns tx hash', async () => {
            const { client } = createClient()

            const result = await client.refund(params)

            expect(mockContract.invoke).toHaveBeenCalledWith(
                'refund_user',
                expect.anything(),
            )
            expect(result).toBe(SAMPLE_TX_HASH)
        })

        it('throws when no signer configured', async () => {
            const { client } = createClient({ withSigner: false })
            await expect(client.refund(params)).rejects.toThrow('Signer required')
        })
    })

    describe('redeemSolver', () => {
        const params = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            secret: '12345' as string | bigint,
            type: 'erc20' as const,
            chainId: 'SN_SEPOLIA',
            sourceAsset: { contractAddress: SAMPLE_TOKEN, symbol: 'ETH', decimals: 18 },
            destLpAddress: SAMPLE_LP_ADDRESS,
        }

        it('invokes redeem_solver and returns tx hash', async () => {
            const { client } = createClient()

            const result = await client.redeemSolver(params)

            expect(mockContract.invoke).toHaveBeenCalledWith(
                'redeem_solver',
                expect.anything(),
            )
            expect(result).toBe(SAMPLE_TX_HASH)
        })

        it('throws when no signer configured', async () => {
            const { client } = createClient({ withSigner: false })
            await expect(client.redeemSolver(params)).rejects.toThrow('Signer required')
        })
    })

    describe('getUserLockDetails', () => {
        const lockParams = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            chainId: 'SN_SEPOLIA',
        }

        it('returns null when sender is zero', async () => {
            mockContract.get_user_lock.mockResolvedValueOnce({
                sender: 0n,
                recipient: 0n,
                token: 0n,
                amount: 0n,
                secret: 0n,
                timelock: 0n,
                status: 0,
            })

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)

            expect(result).toBeNull()
        })

        it('returns mapped lock details when lock exists', async () => {
            mockContract.get_user_lock.mockResolvedValueOnce({
                sender: BigInt(SAMPLE_ADDRESS),
                recipient: BigInt(SAMPLE_LP_ADDRESS),
                token: BigInt(SAMPLE_TOKEN),
                amount: 1000000000000000000n,
                secret: 0n,
                timelock: 1700001000n,
                status: { activeVariant: () => 'Pending' },
            })

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)

            expect(result).not.toBeNull()
            expect(result!.hashlock).toBe(SAMPLE_HASHLOCK)
            expect(result!.timelock).toBe(1700001000)
            expect(result!.status).toBe(LockStatus.Pending)
            expect(result!.secret).toBeUndefined()
        })

        it('returns secret when non-zero', async () => {
            mockContract.get_user_lock.mockResolvedValueOnce({
                sender: BigInt(SAMPLE_ADDRESS),
                recipient: BigInt(SAMPLE_LP_ADDRESS),
                token: BigInt(SAMPLE_TOKEN),
                amount: 1000000000000000000n,
                secret: 42n,
                timelock: 1700001000n,
                status: { activeVariant: () => 'Redeemed' },
            })

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)

            expect(result!.secret).toBe(42n)
            expect(result!.status).toBe(LockStatus.Redeemed)
        })

        it('handles errors gracefully and returns null', async () => {
            mockContract.get_user_lock.mockRejectedValueOnce(new Error('network error'))

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)

            expect(result).toBeNull()
        })
    })

    describe('_getSolverLockDetails', () => {
        const lockParams = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            chainId: 'SN_SEPOLIA',
        }
        const nodeUrl = 'https://starknet-node.example.com'

        it('returns null when count is 0', async () => {
            mockContract.get_solver_lock_count.mockResolvedValueOnce(0n)

            const { client } = createClient()
            const result = await client._getSolverLockDetails(lockParams, nodeUrl)

            expect(result).toBeNull()
        })

        it('returns first valid solver lock', async () => {
            mockContract.get_solver_lock_count.mockResolvedValueOnce(1n)
            mockContract.get_solver_lock.mockResolvedValueOnce({
                sender: BigInt(SAMPLE_LP_ADDRESS),
                recipient: BigInt(SAMPLE_ADDRESS),
                token: BigInt(SAMPLE_TOKEN),
                amount: 1000000000000000000n,
                secret: 0n,
                timelock: 1700001000n,
                reward: 0n,
                reward_timelock: 0n,
                reward_recipient: 0n,
                reward_token: 0n,
                status: { activeVariant: () => 'Pending' },
            })

            const { client } = createClient()
            const result = await client._getSolverLockDetails(lockParams, nodeUrl)

            expect(result).not.toBeNull()
            expect(result!.hashlock).toBe(SAMPLE_HASHLOCK)
            expect(result!.status).toBe(LockStatus.Pending)
            expect(result!.index).toBe(1)
        })

        it('skips locks with zero sender', async () => {
            mockContract.get_solver_lock_count.mockResolvedValueOnce(2n)
            // First lock: zero sender
            mockContract.get_solver_lock.mockResolvedValueOnce({
                sender: 0n,
                recipient: 0n,
                token: 0n,
                amount: 0n,
                secret: 0n,
                timelock: 0n,
                reward: 0n,
                reward_timelock: 0n,
                reward_recipient: 0n,
                reward_token: 0n,
                status: 0,
            })
            // Second lock: valid
            mockContract.get_solver_lock.mockResolvedValueOnce({
                sender: BigInt(SAMPLE_LP_ADDRESS),
                recipient: BigInt(SAMPLE_ADDRESS),
                token: BigInt(SAMPLE_TOKEN),
                amount: 500000000000000000n,
                secret: 0n,
                timelock: 1700001000n,
                reward: 0n,
                reward_timelock: 0n,
                reward_recipient: 0n,
                reward_token: 0n,
                status: { activeVariant: () => 'Pending' },
            })

            const { client } = createClient()
            const result = await client._getSolverLockDetails(lockParams, nodeUrl)

            expect(result).not.toBeNull()
            expect(result!.index).toBe(2)
        })

        it('filters by solverAddress case-insensitively', async () => {
            const solverAddr = '0x' + BigInt(SAMPLE_LP_ADDRESS).toString(16)

            mockContract.get_solver_lock_count.mockResolvedValueOnce(1n)
            mockContract.get_solver_lock.mockResolvedValueOnce({
                sender: BigInt(SAMPLE_LP_ADDRESS),
                recipient: BigInt(SAMPLE_ADDRESS),
                token: BigInt(SAMPLE_TOKEN),
                amount: 1000000000000000000n,
                secret: 0n,
                timelock: 1700001000n,
                reward: 0n,
                reward_timelock: 0n,
                reward_recipient: 0n,
                reward_token: 0n,
                status: { activeVariant: () => 'Pending' },
            })

            const { client } = createClient()
            const result = await client._getSolverLockDetails(
                { ...lockParams, solverAddress: solverAddr.toUpperCase() },
                nodeUrl,
            )

            expect(result).not.toBeNull()
        })

        it('returns null when no locks match solverAddress', async () => {
            mockContract.get_solver_lock_count.mockResolvedValueOnce(1n)
            mockContract.get_solver_lock.mockResolvedValueOnce({
                sender: BigInt(SAMPLE_LP_ADDRESS),
                recipient: BigInt(SAMPLE_ADDRESS),
                token: BigInt(SAMPLE_TOKEN),
                amount: 1000000000000000000n,
                secret: 0n,
                timelock: 1700001000n,
                reward: 0n,
                reward_timelock: 0n,
                reward_recipient: 0n,
                reward_token: 0n,
                status: { activeVariant: () => 'Pending' },
            })

            const { client } = createClient()
            const result = await client._getSolverLockDetails(
                { ...lockParams, solverAddress: '0xnonmatching' },
                nodeUrl,
            )

            expect(result).toBeNull()
        })
    })

    describe('mapLockStatus (via getUserLockDetails)', () => {
        const lockParams = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            chainId: 'SN_SEPOLIA',
        }

        function makeLockResult(status: unknown) {
            return {
                sender: BigInt(SAMPLE_ADDRESS),
                recipient: BigInt(SAMPLE_LP_ADDRESS),
                token: BigInt(SAMPLE_TOKEN),
                amount: 1000000000000000000n,
                secret: 0n,
                timelock: 1700001000n,
                status,
            }
        }

        it('handles CairoCustomEnum with activeVariant() - Pending', async () => {
            mockContract.get_user_lock.mockResolvedValueOnce(
                makeLockResult({ activeVariant: () => 'Pending' })
            )
            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)
            expect(result!.status).toBe(LockStatus.Pending)
        })

        it('handles CairoCustomEnum with activeVariant() - Redeemed', async () => {
            mockContract.get_user_lock.mockResolvedValueOnce(
                makeLockResult({ activeVariant: () => 'Redeemed' })
            )
            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)
            expect(result!.status).toBe(LockStatus.Redeemed)
        })

        it('handles CairoCustomEnum with activeVariant() - Refunded', async () => {
            mockContract.get_user_lock.mockResolvedValueOnce(
                makeLockResult({ activeVariant: () => 'Refunded' })
            )
            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)
            expect(result!.status).toBe(LockStatus.Refunded)
        })

        it('handles unknown activeVariant as Empty', async () => {
            mockContract.get_user_lock.mockResolvedValueOnce(
                makeLockResult({ activeVariant: () => 'Unknown' })
            )
            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)
            expect(result!.status).toBe(LockStatus.Empty)
        })

        it('handles plain number fallback', async () => {
            mockContract.get_user_lock.mockResolvedValueOnce(makeLockResult(1))
            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)
            expect(result!.status).toBe(1)
        })

        it('handles plain bigint fallback', async () => {
            mockContract.get_user_lock.mockResolvedValueOnce(makeLockResult(2n))
            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)
            expect(result!.status).toBe(2)
        })

        it('handles { variant: { Refunded: {} } } object shape', async () => {
            mockContract.get_user_lock.mockResolvedValueOnce(
                makeLockResult({ variant: { Refunded: {} } })
            )
            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)
            expect(result!.status).toBe(LockStatus.Refunded)
        })

        it('returns Empty for unrecognized input', async () => {
            mockContract.get_user_lock.mockResolvedValueOnce(makeLockResult('garbage'))
            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)
            expect(result!.status).toBe(LockStatus.Empty)
        })
    })

    describe('recoverSwap', () => {
        it('throws not supported', async () => {
            const { client } = createClient()
            await expect(client.recoverSwap('0xabc')).rejects.toThrow(
                'recoverSwap is not supported for Starknet'
            )
        })
    })
})
