import { describe, it, expect, vi, beforeEach } from 'vitest'
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

// vi.hoisted runs before vi.mock factories, making these available
const { mockTrainMethods, mockSendResult } = vi.hoisted(() => ({
    mockTrainMethods: {
        user_lock: { __mock: true } as any,
        refund_user: { __mock: true } as any,
        redeem_solver: { __mock: true } as any,
        get_user_lock: { __mock: true } as any,
        get_solver_lock: { __mock: true } as any,
        get_solver_lock_count: { __mock: true } as any,
    },
    mockSendResult: {
        txHash: { toString: () => '0x' + 'bb'.repeat(32) },
        hasExecutionReverted: { __mock: true } as any,
        error: null as any,
    },
}))

vi.mock('@aztec/aztec.js/abi', () => ({
    EventSelector: { fromField: vi.fn().mockReturnValue({ toString: () => 'selector' }) },
    decodeFromAbi: vi.fn().mockReturnValue({}),
}))

vi.mock('@aztec/aztec.js/addresses', () => ({
    AztecAddress: {
        fromString: vi.fn((s: string) => ({ toString: () => s })),
    },
}))

vi.mock('@aztec/aztec.js/authorization', () => ({
    SetPublicAuthwitContractInteraction: {
        create: vi.fn().mockResolvedValue({ request: vi.fn() }),
    },
}))

vi.mock('@aztec/aztec.js/contracts', () => ({
    BatchCall: class {
        constructor() {}
        send = vi.fn().mockResolvedValue(mockSendResult)
    },
    getContractInstanceFromInstantiationParams: vi.fn().mockResolvedValue({
        address: { toString: () => '0xfpc' },
    }),
}))

vi.mock('@aztec/aztec.js/fee', () => ({
    SponsoredFeePaymentMethod: class {
        constructor() {}
    },
}))

vi.mock('@aztec/aztec.js/fields', () => {
    function Fr() {}
    Fr.random = vi.fn().mockReturnValue({ toBuffer: () => Buffer.alloc(32) })
    Fr.fromBuffer = vi.fn().mockReturnValue({})
    return { Fr }
})

vi.mock('@aztec/aztec.js/node', () => ({
    createAztecNodeClient: vi.fn().mockReturnValue({
        getContract: vi.fn().mockResolvedValue({ artifact: {} }),
        getPublicLogs: vi.fn().mockResolvedValue({ logs: [] }),
    }),
}))

vi.mock('@aztec/aztec.js/tx', () => ({
    TxHash: { fromString: vi.fn().mockReturnValue({}) },
}))

vi.mock('@aztec/aztec.js/wallet', () => ({}))

vi.mock('@aztec/noir-contracts.js/SponsoredFPC', () => ({
    SponsoredFPCContract: { artifact: {} },
}))

vi.mock('../artifacts/Train', () => ({
    TrainContract: {
        at: vi.fn().mockReturnValue({ methods: mockTrainMethods }),
        artifact: {},
        events: {
            UserLocked: {
                eventSelector: { toString: () => 'selector' },
                abiType: {},
            },
        },
    },
}))

vi.mock('../artifacts/Token', () => ({
    TokenContract: {
        at: vi.fn().mockReturnValue({
            methods: {
                transfer_public_to_public: vi.fn().mockReturnValue({}),
            },
        }),
        artifact: {},
    },
}))

import { AztecHTLCClient } from '../client.js'

function createClient(opts?: { withSigner?: boolean }) {
    const signer = opts?.withSigner !== false ? createMockSigner() : undefined
    return {
        client: new AztecHTLCClient({
            rpcUrl: 'https://aztec.example.com',
            apiClient: createMockApiClient(),
            signer: signer as any,
        }),
        signer,
    }
}

function initMocks() {
    // Initialize mockTrainMethods with vi.fn() (can't be done in vi.hoisted)
    mockTrainMethods.user_lock = vi.fn().mockReturnValue({ send: vi.fn() })
    mockTrainMethods.refund_user = vi.fn().mockReturnValue({ send: vi.fn().mockResolvedValue(mockSendResult) })
    mockTrainMethods.redeem_solver = vi.fn().mockReturnValue({ send: vi.fn().mockResolvedValue(mockSendResult) })
    mockTrainMethods.get_user_lock = vi.fn().mockReturnValue({
        simulate: vi.fn().mockResolvedValue({ status: 0 }),
    })
    mockTrainMethods.get_solver_lock = vi.fn().mockReturnValue({
        simulate: vi.fn().mockResolvedValue({}),
    })
    mockTrainMethods.get_solver_lock_count = vi.fn().mockReturnValue({
        simulate: vi.fn().mockResolvedValue(0),
    })
    mockSendResult.hasExecutionReverted = vi.fn().mockReturnValue(false)
    mockSendResult.error = null
}

describe('AztecHTLCClient', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        initMocks()
    })

    describe('userLock', () => {
        const params = {
            destinationChain: 'eip155:1',
            sourceChain: 'aztec:devnet',
            amount: '1.0',
            destinationAmount: '1000000000000000000',
            decimals: 18,
            destinationAsset: '0xdsttoken',
            sourceAsset: { contractAddress: SAMPLE_TOKEN, symbol: 'TOKEN', decimals: 18 },
            destLpAddress: SAMPLE_LP_ADDRESS,
            srcLpAddress: SAMPLE_LP_ADDRESS,
            atomicContract: SAMPLE_CONTRACT,
            sourceAddress: SAMPLE_ADDRESS,
            destinationAddress: '0xdestaddr',
            tokenContractAddress: SAMPLE_TOKEN,
            hashlock: SAMPLE_HASHLOCK,
            nonce: 1700000000000,
            quoteExpiry: 1700001000,
            timelockDelta: 40,
        } as any

        it('returns hash, hashlock, and nonce on success', async () => {
            const { client } = createClient()
            const result = await client.userLock(params)

            expect(result.hash).toBe(SAMPLE_TX_HASH)
            expect(result.hashlock).toBe(SAMPLE_HASHLOCK)
            expect(result.nonce).toBe(1700000000000)
        })

        it('throws when no signer configured', async () => {
            const { client } = createClient({ withSigner: false })
            await expect(client.userLock(params)).rejects.toThrow('Signer required')
        })

        it('throws when batch transaction reverts', async () => {
            mockSendResult.hasExecutionReverted = vi.fn().mockReturnValue(true)
            mockSendResult.error = 'out of gas' as any

            const { client } = createClient()
            await expect(client.userLock(params)).rejects.toThrow('user_lock reverted')
        })
    })

    describe('refund', () => {
        const params = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            type: 'erc20' as const,
            chainId: 'aztec:devnet',
            sourceAsset: { contractAddress: SAMPLE_TOKEN, symbol: 'TOKEN', decimals: 18 },
        }

        it('returns transaction hash on success', async () => {
            const { client } = createClient()
            const result = await client.refund(params)
            expect(result).toBe(SAMPLE_TX_HASH)
        })

        it('throws when no signer configured', async () => {
            const { client } = createClient({ withSigner: false })
            await expect(client.refund(params)).rejects.toThrow('Signer required')
        })

        it('throws when execution reverts', async () => {
            mockSendResult.hasExecutionReverted = vi.fn().mockReturnValue(true)
            mockSendResult.error = 'timelock not expired' as any

            const { client } = createClient()
            await expect(client.refund(params)).rejects.toThrow('refund_user reverted')
        })
    })

    describe('redeemSolver', () => {
        const params = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            secret: 12345n,
            type: 'erc20' as const,
            chainId: 'aztec:devnet',
            sourceAsset: { contractAddress: SAMPLE_TOKEN, symbol: 'TOKEN', decimals: 18 },
            destLpAddress: SAMPLE_LP_ADDRESS,
        }

        it('returns transaction hash on success', async () => {
            const { client } = createClient()
            const result = await client.redeemSolver(params)
            expect(result).toBe(SAMPLE_TX_HASH)
        })

        it('throws when no signer configured', async () => {
            const { client } = createClient({ withSigner: false })
            await expect(client.redeemSolver(params)).rejects.toThrow('Signer required')
        })

        it('throws when execution reverts', async () => {
            mockSendResult.hasExecutionReverted = vi.fn().mockReturnValue(true)
            const { client } = createClient()
            await expect(client.redeemSolver(params)).rejects.toThrow('redeem_solver reverted')
        })
    })

    describe('getUserLockDetails', () => {
        const lockParams = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            chainId: 'aztec:devnet',
        }

        it('returns null when status is 0', async () => {
            mockTrainMethods.get_user_lock = vi.fn().mockReturnValue({
                simulate: vi.fn().mockResolvedValue({ status: 0 }),
            })

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)
            expect(result).toBeNull()
        })

        it('returns mapped details when lock exists', async () => {
            mockTrainMethods.get_user_lock = vi.fn().mockReturnValue({
                simulate: vi.fn().mockResolvedValue({
                    status: 1,
                    amount: 1000000000000000000n,
                    sender: { toString: () => SAMPLE_ADDRESS },
                    recipient: { toString: () => SAMPLE_LP_ADDRESS },
                    token: { toString: () => SAMPLE_TOKEN },
                    timelock: 1700001000n,
                    secret: [0, 0, 0],
                }),
            })

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)

            expect(result).not.toBeNull()
            expect(result!.hashlock).toBe(SAMPLE_HASHLOCK)
            expect(result!.status).toBe(1)
            expect(result!.timelock).toBe(1700001000)
        })

        it('returns undefined secret when bytes are all zero', async () => {
            mockTrainMethods.get_user_lock = vi.fn().mockReturnValue({
                simulate: vi.fn().mockResolvedValue({
                    status: 1,
                    amount: 1000000000000000000n,
                    sender: { toString: () => SAMPLE_ADDRESS },
                    recipient: { toString: () => SAMPLE_LP_ADDRESS },
                    token: { toString: () => SAMPLE_TOKEN },
                    timelock: 1700001000n,
                    secret: [0, 0, 0],
                }),
            })

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)
            expect(result!.secret).toBeUndefined()
        })

        it('returns secret bigint when bytes are non-zero', async () => {
            mockTrainMethods.get_user_lock = vi.fn().mockReturnValue({
                simulate: vi.fn().mockResolvedValue({
                    status: 1,
                    amount: 1000000000000000000n,
                    sender: { toString: () => SAMPLE_ADDRESS },
                    recipient: { toString: () => SAMPLE_LP_ADDRESS },
                    token: { toString: () => SAMPLE_TOKEN },
                    timelock: 1700001000n,
                    secret: [0, 0, 1, 0],
                }),
            })

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)
            expect(result!.secret).toBeDefined()
            expect(typeof result!.secret).toBe('bigint')
        })
    })

    describe('_getSolverLockDetails', () => {
        const lockParams = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            chainId: 'aztec:devnet',
        }
        const nodeUrl = 'https://aztec-node.example.com'

        it('returns null when count is 0', async () => {
            mockTrainMethods.get_solver_lock_count = vi.fn().mockReturnValue({
                simulate: vi.fn().mockResolvedValue(0),
            })

            const { client } = createClient()
            const result = await client._getSolverLockDetails(lockParams, nodeUrl)
            expect(result).toBeNull()
        })

        it('returns first valid solver lock', async () => {
            mockTrainMethods.get_solver_lock_count = vi.fn().mockReturnValue({
                simulate: vi.fn().mockResolvedValue(1),
            })
            mockTrainMethods.get_solver_lock = vi.fn().mockReturnValue({
                simulate: vi.fn().mockResolvedValue({
                    status: 1,
                    amount: 500000000000000000n,
                    sender: { toString: () => SAMPLE_LP_ADDRESS },
                    recipient: { toString: () => SAMPLE_ADDRESS },
                    token: { toString: () => SAMPLE_TOKEN },
                    timelock: 1700001000n,
                    reward: 0n,
                    reward_timelock: 0n,
                    reward_recipient: { toString: () => '' },
                    reward_token: { toString: () => '' },
                    secret: [0, 0, 0],
                }),
            })

            const { client } = createClient()
            const result = await client._getSolverLockDetails(lockParams, nodeUrl)

            expect(result).not.toBeNull()
            expect(result!.hashlock).toBe(SAMPLE_HASHLOCK)
            expect(result!.status).toBe(1)
            expect(result!.index).toBe(1)
        })

        it('skips locks with status 0', async () => {
            mockTrainMethods.get_solver_lock_count = vi.fn().mockReturnValue({
                simulate: vi.fn().mockResolvedValue(2),
            })
            const getSolverLock = vi.fn()
                .mockReturnValueOnce({
                    simulate: vi.fn().mockResolvedValue({ status: 0 }),
                })
                .mockReturnValueOnce({
                    simulate: vi.fn().mockResolvedValue({
                        status: 1,
                        amount: 500000000000000000n,
                        sender: { toString: () => SAMPLE_LP_ADDRESS },
                        recipient: { toString: () => SAMPLE_ADDRESS },
                        token: { toString: () => SAMPLE_TOKEN },
                        timelock: 1700001000n,
                        reward: 0n,
                        reward_timelock: 0n,
                        reward_recipient: { toString: () => '' },
                        reward_token: { toString: () => '' },
                        secret: [0, 0, 0],
                    }),
                })
            mockTrainMethods.get_solver_lock = getSolverLock

            const { client } = createClient()
            const result = await client._getSolverLockDetails(lockParams, nodeUrl)

            expect(result).not.toBeNull()
            expect(result!.index).toBe(2)
        })

        it('filters by solverAddress', async () => {
            mockTrainMethods.get_solver_lock_count = vi.fn().mockReturnValue({
                simulate: vi.fn().mockResolvedValue(1),
            })
            mockTrainMethods.get_solver_lock = vi.fn().mockReturnValue({
                simulate: vi.fn().mockResolvedValue({
                    status: 1,
                    amount: 500000000000000000n,
                    sender: { toString: () => SAMPLE_LP_ADDRESS },
                    recipient: { toString: () => SAMPLE_ADDRESS },
                    token: { toString: () => SAMPLE_TOKEN },
                    timelock: 1700001000n,
                    reward: 0n,
                    reward_timelock: 0n,
                    reward_recipient: { toString: () => '' },
                    reward_token: { toString: () => '' },
                    secret: [0, 0, 0],
                }),
            })

            const { client } = createClient()
            const result = await client._getSolverLockDetails(
                { ...lockParams, solverAddress: '0xnonmatching' },
                nodeUrl,
            )

            expect(result).toBeNull()
        })
    })

    describe('recoverSwap', () => {
        it('throws not supported', async () => {
            const { client } = createClient()
            await expect(client.recoverSwap('0xabc')).rejects.toThrow(
                'recoverSwap is not supported for Aztec'
            )
        })
    })
})
