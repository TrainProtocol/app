import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EvmHTLCClient } from '../client.js'
import {
    ZERO_ADDRESS,
    SAMPLE_ADDRESS,
    SAMPLE_LP_ADDRESS,
    SAMPLE_CONTRACT,
    SAMPLE_TOKEN,
    SAMPLE_HASHLOCK,
    SAMPLE_TX_HASH,
    createMockSigner,
    createMockApiClient,
    createMockRpc,
} from './helpers.js'

// Mock ox module
vi.mock('ox', () => ({
    AbiFunction: {
        encodeData: vi.fn().mockReturnValue('0xencoded'),
        decodeResult: vi.fn().mockReturnValue({}),
        fromAbi: vi.fn().mockReturnValue({}),
        from: vi.fn().mockReturnValue({}),
    },
    AbiEvent: {
        decode: vi.fn().mockReturnValue({}),
        fromAbi: vi.fn().mockReturnValue({}),
    },
}))

// Mock abi.js (loaded at module level, must be mocked before import)
vi.mock('../abi.js', () => ({
    htlcFunctions: {
        userLock: { name: 'userLock' },
        refundUser: { name: 'refundUser' },
        redeemSolver: { name: 'redeemSolver' },
        getUserLock: { name: 'getUserLock' },
        getSolverLock: { name: 'getSolverLock' },
        getSolverLockCount: { name: 'getSolverLockCount' },
    },
    htlcEvents: {
        UserLocked: { name: 'UserLocked' },
    },
    erc20Functions: {
        allowance: { name: 'allowance' },
        approve: { name: 'approve' },
    },
}))

// We need to mock JsonRpcClient constructor
const mockRpc = createMockRpc()
vi.mock('../rpc.js', () => {
    return {
        JsonRpcClient: class {
            constructor() {
                return mockRpc
            }
        },
        JsonRpcError: class extends Error {
            code: number
            data?: unknown
            constructor(message: string, code: number, data?: unknown) {
                super(message)
                this.code = code
                this.data = data
            }
        },
    }
})

// Import mocked modules for assertion access
import { AbiFunction, AbiEvent } from 'ox'

function createClient(opts?: { withSigner?: boolean }) {
    const signer = opts?.withSigner !== false ? createMockSigner() : undefined
    return {
        client: new EvmHTLCClient({
            rpcUrl: 'https://rpc.example.com',
            apiClient: createMockApiClient(),
            signer,
        }),
        signer,
    }
}

function createUserLockParams(overrides?: Record<string, unknown>) {
    return {
        destinationChain: 'eip155:1',
        sourceChain: 'eip155:11155111',
        amount: '1.0',
        destinationAmount: '1000000000000000000',
        decimals: 18,
        destinationAsset: '0xdsttoken',
        sourceAsset: { contractAddress: SAMPLE_TOKEN, symbol: 'USDC', decimals: 18 },
        destLpAddress: SAMPLE_LP_ADDRESS,
        srcLpAddress: SAMPLE_LP_ADDRESS,
        atomicContract: SAMPLE_CONTRACT,
        sourceAddress: SAMPLE_ADDRESS,
        destinationAddress: '0xdestaddr',
        hashlock: SAMPLE_HASHLOCK,
        nonce: 1700000000000,
        quoteExpiry: 1700001000,
        timelockDelta: 150,
        ...overrides,
    } as any
}

describe('EvmHTLCClient', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        // Re-set defaults after reset (resetAllMocks clears all implementations)
        mockRpc.ethCall.mockResolvedValue('0x')
        mockRpc.getTransactionReceipt.mockResolvedValue(null)
        mockRpc.getTransaction.mockResolvedValue(null)
        mockRpc.getBlockByNumber.mockResolvedValue(null)
            ; (AbiFunction.encodeData as any).mockReturnValue('0xencoded')
            ; (AbiFunction.decodeResult as any).mockReturnValue({})
            ; (AbiEvent.decode as any).mockReturnValue({})
    })

    describe('userLock', () => {
        it('returns hash, hashlock, and nonce on success', async () => {
            const { client } = createClient()
                // allowance check returns sufficient allowance
                ; (AbiFunction.decodeResult as any).mockReturnValueOnce(10n ** 30n)

            const result = await client.userLock(createUserLockParams())

            expect(result.hash).toBe(SAMPLE_TX_HASH)
            expect(result.hashlock).toBe(SAMPLE_HASHLOCK)
            expect(result.nonce).toBe(1700000000000)
        })

        it('simulates via eth_call before sending transaction', async () => {
            const { client, signer } = createClient()
                ; (AbiFunction.decodeResult as any).mockReturnValueOnce(10n ** 30n)

            await client.userLock(createUserLockParams())

            // eth_call simulation should happen before sendTransaction
            expect(mockRpc.ethCall).toHaveBeenCalled()
            expect(signer!.sendTransaction).toHaveBeenCalled()
        })

        it('sends value for native token (no contractAddress)', async () => {
            const { client, signer } = createClient()

            const params = createUserLockParams({
                sourceAsset: { contractAddress: undefined, symbol: 'ETH', decimals: 18, name: 'ETH' },
            })

            await client.userLock(params)

            expect(signer!.sendTransaction).toHaveBeenCalledWith(
                expect.objectContaining({ value: expect.anything() })
            )
        })

        it('skips ERC20 allowance check for native tokens', async () => {
            const { client } = createClient()

            const params = createUserLockParams({
                sourceAsset: { contractAddress: undefined, symbol: 'ETH', decimals: 18, name: 'ETH' },
            })

            await client.userLock(params)

            // Should not call decodeResult for allowance (only for simulation)
            // The key indicator is that sendTransaction value should be set
            expect((AbiFunction.encodeData as any).mock.calls[0][0].name).toBe('userLock')
        })

        it('checks and approves ERC20 when allowance is insufficient', async () => {
            const { client, signer } = createClient()
                // First decodeResult: allowance = 0 (insufficient)
                ; (AbiFunction.decodeResult as any).mockReturnValueOnce(0n)
            // waitForReceipt (now private) polls getTransactionReceipt
            mockRpc.getTransactionReceipt.mockResolvedValue({ status: '0x1' })

            await client.userLock(createUserLockParams())

            // sendTransaction called twice: once for approve, once for userLock
            expect(signer!.sendTransaction).toHaveBeenCalledTimes(2)
        })

        it('skips approve when ERC20 allowance is sufficient', async () => {
            const { client, signer } = createClient()
                // allowance >= required
                ; (AbiFunction.decodeResult as any).mockReturnValueOnce(10n ** 30n)

            await client.userLock(createUserLockParams())

            // sendTransaction called only once (for userLock, not approve)
            expect(signer!.sendTransaction).toHaveBeenCalledTimes(1)
        })

        it('throws when no signer configured', async () => {
            const { client } = createClient({ withSigner: false })

            await expect(client.userLock(createUserLockParams())).rejects.toThrow('Signer required')
        })

        it('propagates eth_call simulation errors', async () => {
            const { client } = createClient()
                ; (AbiFunction.decodeResult as any).mockReturnValueOnce(10n ** 30n)
            mockRpc.ethCall.mockRejectedValueOnce(new Error('execution reverted'))

            await expect(client.userLock(createUserLockParams())).rejects.toThrow('execution reverted')
        })
    })

    describe('refund', () => {
        it('encodes and sends refund transaction', async () => {
            const { client, signer } = createClient()

            const result = await client.refund({
                id: SAMPLE_HASHLOCK,
                contractAddress: SAMPLE_CONTRACT,
                type: 'erc20',
                chainId: '11155111',
                sourceAsset: { contractAddress: SAMPLE_TOKEN, symbol: 'USDC', decimals: 18 },
            })

            expect(result).toBe(SAMPLE_TX_HASH)
            expect(mockRpc.ethCall).toHaveBeenCalledWith(
                SAMPLE_CONTRACT,
                '0xencoded',
                SAMPLE_ADDRESS,
            )
            expect(signer!.sendTransaction).toHaveBeenCalledWith({
                to: SAMPLE_CONTRACT,
                data: '0xencoded',
            })
        })

        it('throws when no signer configured', async () => {
            const { client } = createClient({ withSigner: false })

            await expect(
                client.refund({
                    id: SAMPLE_HASHLOCK,
                    contractAddress: SAMPLE_CONTRACT,
                    type: 'erc20',
                    chainId: '11155111',
                    sourceAsset: { contractAddress: SAMPLE_TOKEN, symbol: 'USDC', decimals: 18 },
                })
            ).rejects.toThrow('Signer required')
        })
    })

    describe('redeemSolver', () => {
        const redeemParams = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            secret: '12345' as string | bigint,
            type: 'erc20' as const,
            chainId: '11155111',
            sourceAsset: { contractAddress: SAMPLE_TOKEN, symbol: 'USDC', decimals: 18 },
            destLpAddress: SAMPLE_LP_ADDRESS,
        }

        it('encodes and sends redeem transaction', async () => {
            const { client } = createClient()

            const result = await client.redeemSolver(redeemParams)

            expect(result).toBe(SAMPLE_TX_HASH)
            expect(AbiFunction.encodeData).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'redeemSolver' }),
                expect.arrayContaining([expect.anything(), 1n, 12345n])
            )
        })

        it('uses destinationAddress as caller when provided', async () => {
            const { client } = createClient()
            const destAddr = '0xdestination'

            await client.redeemSolver({ ...redeemParams, destinationAddress: destAddr })

            expect(mockRpc.ethCall).toHaveBeenCalledWith(
                SAMPLE_CONTRACT,
                '0xencoded',
                destAddr,
            )
        })

        it('falls back to signer address when no destinationAddress', async () => {
            const { client } = createClient()

            await client.redeemSolver(redeemParams)

            expect(mockRpc.ethCall).toHaveBeenCalledWith(
                SAMPLE_CONTRACT,
                '0xencoded',
                SAMPLE_ADDRESS,
            )
        })

        it('throws when no signer configured', async () => {
            const { client } = createClient({ withSigner: false })

            await expect(client.redeemSolver(redeemParams)).rejects.toThrow('Signer required')
        })
    })

    describe('getUserLockDetails', () => {
        const lockParams = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            chainId: '11155111',
        }

        it('returns mapped lock details when lock exists', async () => {
            ; (AbiFunction.decodeResult as any).mockReturnValueOnce({
                sender: SAMPLE_ADDRESS,
                recipient: SAMPLE_LP_ADDRESS,
                token: SAMPLE_TOKEN,
                amount: 1000000000000000000n,
                secret: 0n,
                timelock: 1700001000n,
                status: 1n,
            })

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)

            expect(result).toMatchObject({
                hashlock: SAMPLE_HASHLOCK,
                sender: SAMPLE_ADDRESS,
                recipient: SAMPLE_LP_ADDRESS,
                token: SAMPLE_TOKEN,
                timelock: 1700001000,
                status: 1,
            })
            expect(result!.secret).toBeUndefined() // secret is 0n
        })

        it('returns undefined fields when sender is zero address', async () => {
            ; (AbiFunction.decodeResult as any).mockReturnValueOnce({
                sender: ZERO_ADDRESS,
                recipient: ZERO_ADDRESS,
                token: ZERO_ADDRESS,
                amount: 0n,
                secret: 0n,
                timelock: 0n,
                status: 0n,
            })

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)

            expect(result!.hashlock).toBeUndefined()
            expect(result!.sender).toBeUndefined()
            expect(result!.status).toBeUndefined()
        })

        it('fetches userData from receipt logs when txId provided', async () => {
            ; (AbiFunction.decodeResult as any).mockReturnValueOnce({
                sender: SAMPLE_ADDRESS,
                recipient: SAMPLE_LP_ADDRESS,
                token: SAMPLE_TOKEN,
                amount: 1000000000000000000n,
                secret: 0n,
                timelock: 1700001000n,
                status: 1n,
            })

            const receipt = {
                logs: [{ data: '0x', topics: ['0xtopic'], address: SAMPLE_CONTRACT, logIndex: '0x0', blockNumber: '0x10', transactionHash: SAMPLE_TX_HASH }],
                blockNumber: '0x10',
                transactionHash: SAMPLE_TX_HASH,
                status: '0x1',
            }
            mockRpc.getTransactionReceipt.mockResolvedValueOnce(receipt)
            mockRpc.getBlockByNumber.mockResolvedValueOnce({ number: '0x10', timestamp: '0x65a00000' })

                // AbiEvent.decode returns event with userData
                ; (AbiEvent.decode as any).mockReturnValueOnce({
                    hashlock: SAMPLE_HASHLOCK,
                    userData: '0x' + BigInt(1700000000000).toString(16),
                })

            const { client } = createClient()
            const result = await client.getUserLockDetails({ ...lockParams, txId: SAMPLE_TX_HASH })

            expect(result!.userData).toBe('1700000000000')
            expect(result!.blockTimestamp).toBeDefined()
        })

        it('handles missing txId gracefully', async () => {
            ; (AbiFunction.decodeResult as any).mockReturnValueOnce({
                sender: SAMPLE_ADDRESS,
                recipient: SAMPLE_LP_ADDRESS,
                token: SAMPLE_TOKEN,
                amount: 1000000000000000000n,
                secret: 0n,
                timelock: 1700001000n,
                status: 1n,
            })

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)

            expect(result!.userData).toBeUndefined()
            expect(result!.blockTimestamp).toBeUndefined()
            expect(mockRpc.getTransactionReceipt).not.toHaveBeenCalled()
        })

        it('returns secret as bigint when non-zero', async () => {
            ; (AbiFunction.decodeResult as any).mockReturnValueOnce({
                sender: SAMPLE_ADDRESS,
                recipient: SAMPLE_LP_ADDRESS,
                token: SAMPLE_TOKEN,
                amount: 1000000000000000000n,
                secret: 42n,
                timelock: 1700001000n,
                status: 1n,
            })

            const { client } = createClient()
            const result = await client.getUserLockDetails(lockParams)

            expect(result!.secret).toBe(42n)
        })
    })

    describe('_getSolverLockDetails', () => {
        const lockParams = {
            id: SAMPLE_HASHLOCK,
            contractAddress: SAMPLE_CONTRACT,
            chainId: '11155111',
        }
        const nodeUrl = 'https://node.example.com'

        it('returns null when solver lock count is 0', async () => {
            ; (AbiFunction.decodeResult as any).mockReturnValueOnce(0)

            const { client } = createClient()
            const result = await client._getSolverLockDetails(lockParams, nodeUrl)

            expect(result).toBeNull()
        })

        it('returns first valid solver lock', async () => {
            // count = 1
            ; (AbiFunction.decodeResult as any).mockReturnValueOnce(1)
                // solver lock result
                ; (AbiFunction.decodeResult as any).mockReturnValueOnce({
                    sender: SAMPLE_LP_ADDRESS,
                    recipient: SAMPLE_ADDRESS,
                    token: SAMPLE_TOKEN,
                    amount: 1000000000000000000n,
                    secret: 0n,
                    timelock: 1700001000n,
                    reward: 0n,
                    rewardTimelock: 0n,
                    rewardRecipient: ZERO_ADDRESS,
                    rewardToken: ZERO_ADDRESS,
                    status: 1n,
                })

            const { client } = createClient()
            const result = await client._getSolverLockDetails(lockParams, nodeUrl)

            expect(result).toMatchObject({
                hashlock: SAMPLE_HASHLOCK,
                sender: SAMPLE_LP_ADDRESS,
                status: 1,
            })
        })

        it('skips locks with zero address sender', async () => {
            // count = 2
            ; (AbiFunction.decodeResult as any).mockReturnValueOnce(2)
                // first lock: zero sender
                ; (AbiFunction.decodeResult as any).mockReturnValueOnce({
                    sender: ZERO_ADDRESS,
                    recipient: ZERO_ADDRESS,
                    token: ZERO_ADDRESS,
                    amount: 0n,
                    secret: 0n,
                    timelock: 0n,
                    reward: 0n,
                    rewardTimelock: 0n,
                    rewardRecipient: ZERO_ADDRESS,
                    rewardToken: ZERO_ADDRESS,
                    status: 0n,
                })
                // second lock: valid
                ; (AbiFunction.decodeResult as any).mockReturnValueOnce({
                    sender: SAMPLE_LP_ADDRESS,
                    recipient: SAMPLE_ADDRESS,
                    token: SAMPLE_TOKEN,
                    amount: 500000000000000000n,
                    secret: 0n,
                    timelock: 1700001000n,
                    reward: 0n,
                    rewardTimelock: 0n,
                    rewardRecipient: ZERO_ADDRESS,
                    rewardToken: ZERO_ADDRESS,
                    status: 1n,
                })

            const { client } = createClient()
            const result = await client._getSolverLockDetails(lockParams, nodeUrl)

            expect(result).not.toBeNull()
            expect(result!.sender).toBe(SAMPLE_LP_ADDRESS)
        })

        it('filters by solverAddress case-insensitively', async () => {
            // count = 1
            ; (AbiFunction.decodeResult as any).mockReturnValueOnce(1)
                ; (AbiFunction.decodeResult as any).mockReturnValueOnce({
                    sender: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
                    recipient: SAMPLE_ADDRESS,
                    token: SAMPLE_TOKEN,
                    amount: 1000000000000000000n,
                    secret: 0n,
                    timelock: 1700001000n,
                    reward: 0n,
                    rewardTimelock: 0n,
                    rewardRecipient: ZERO_ADDRESS,
                    rewardToken: ZERO_ADDRESS,
                    status: 1n,
                })

            const { client } = createClient()
            const result = await client._getSolverLockDetails(
                { ...lockParams, solverAddress: '0xabcdef1234567890abcdef1234567890abcdef12' },
                nodeUrl,
            )

            expect(result).not.toBeNull()
        })

        it('returns null when no locks match solverAddress', async () => {
            ; (AbiFunction.decodeResult as any).mockReturnValueOnce(1)
                ; (AbiFunction.decodeResult as any).mockReturnValueOnce({
                    sender: SAMPLE_LP_ADDRESS,
                    recipient: SAMPLE_ADDRESS,
                    token: SAMPLE_TOKEN,
                    amount: 1000000000000000000n,
                    secret: 0n,
                    timelock: 1700001000n,
                    reward: 0n,
                    rewardTimelock: 0n,
                    rewardRecipient: ZERO_ADDRESS,
                    rewardToken: ZERO_ADDRESS,
                    status: 1n,
                })

            const { client } = createClient()
            const result = await client._getSolverLockDetails(
                { ...lockParams, solverAddress: '0xnonmatchingaddress' },
                nodeUrl,
            )

            expect(result).toBeNull()
        })
    })

    describe('recoverSwap', () => {
        it('returns RecoveredSwapData from receipt and tx', async () => {
            const receipt = {
                logs: [{ data: '0x', topics: ['0xtopic'], address: SAMPLE_CONTRACT, logIndex: '0x0', blockNumber: '0x10', transactionHash: SAMPLE_TX_HASH }],
                blockNumber: '0x10',
                transactionHash: SAMPLE_TX_HASH,
                status: '0x1',
            }
            const tx = { to: SAMPLE_CONTRACT, from: SAMPLE_ADDRESS, hash: SAMPLE_TX_HASH, input: '0x', value: '0x0', blockNumber: '0x10' }

            mockRpc.getTransactionReceipt.mockResolvedValueOnce(receipt)
            mockRpc.getTransaction.mockResolvedValueOnce(tx)

                ; (AbiEvent.decode as any).mockReturnValueOnce({
                    hashlock: SAMPLE_HASHLOCK,
                    sender: SAMPLE_ADDRESS,
                    recipient: SAMPLE_LP_ADDRESS,
                    srcChain: 'eip155:11155111',
                    dstChain: 'eip155:1',
                    token: SAMPLE_TOKEN,
                    amount: 1000000000000000000n,
                    dstAddress: '0xdest',
                    dstAmount: 1000000000000000000n,
                    dstToken: '0xdsttoken',
                })

            const { client } = createClient()
            const result = await client.recoverSwap(SAMPLE_TX_HASH)

            expect(result).toMatchObject({
                hashlock: SAMPLE_HASHLOCK,
                sender: SAMPLE_ADDRESS,
                srcContract: SAMPLE_CONTRACT,
            })
        })

        it('throws when transaction not found', async () => {
            mockRpc.getTransactionReceipt.mockResolvedValueOnce(null)
            mockRpc.getTransaction.mockResolvedValueOnce(null)

            const { client } = createClient()

            await expect(client.recoverSwap(SAMPLE_TX_HASH)).rejects.toThrow('Transaction not found')
        })

        it('throws when no UserLocked event in logs', async () => {
            const receipt = { logs: [], blockNumber: '0x10', transactionHash: SAMPLE_TX_HASH, status: '0x1' }
            const tx = { to: SAMPLE_CONTRACT, from: SAMPLE_ADDRESS, hash: SAMPLE_TX_HASH, input: '0x', value: '0x0', blockNumber: '0x10' }

            mockRpc.getTransactionReceipt.mockResolvedValueOnce(receipt)
            mockRpc.getTransaction.mockResolvedValueOnce(tx)

            const { client } = createClient()

            await expect(client.recoverSwap(SAMPLE_TX_HASH)).rejects.toThrow(
                'This transaction does not contain a swap lock'
            )
        })
    })
})
