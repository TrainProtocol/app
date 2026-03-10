import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LockStatus, type TrainApiClient } from '@train-protocol/sdk'
import { BN } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { SolanaHTLCClient } from '../client.js'

// ── Constants ────────────────────────────────────────────────────────────────

const BLOCKHASH = 'BlockHash1111111111111111111111111111111111'
const SIGNATURE = 'TxSig111111111111111111111111111111111111111'
const CONTRACT = '11111111111111111111111111111111'
const HASHLOCK = '0x' + 'ab'.repeat(32)
const SIGNER_KEY = 'So11111111111111111111111111111111111111112'
const SENDER_KEY = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const RECIPIENT_KEY = '4NSREK36nAr32vooa3L7US9byT11xGJhbxPZfY4iBhEj'
const TOKEN_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
    const makeChain = () => {
        const chain: any = {
            accounts: vi.fn(),
            instruction: vi.fn().mockResolvedValue({}),
            transaction: vi.fn().mockResolvedValue({}),
        }
        chain.accounts.mockReturnValue(chain)
        return chain
    }

    return {
        program: {
            methods: {
                userLockSol: vi.fn().mockReturnValue(makeChain()),
                userLockToken: vi.fn().mockReturnValue(makeChain()),
                refundUserSol: vi.fn().mockReturnValue(makeChain()),
                refundUserToken: vi.fn().mockReturnValue(makeChain()),
                closeUserLock: vi.fn().mockReturnValue(makeChain()),
                redeemSolverSol: vi.fn().mockReturnValue(makeChain()),
                redeemSolverToken: vi.fn().mockReturnValue(makeChain()),
                getSolverLockCount: vi.fn().mockReturnValue({ view: vi.fn().mockResolvedValue(0) }),
            },
            account: {
                userLock: { fetch: vi.fn() },
                solverLock: { fetch: vi.fn() },
            },
            programId: null as any,
            coder: { events: { decode: vi.fn().mockReturnValue(null) } },
        },
        connection: {
            getAccountInfo: vi.fn().mockResolvedValue(null),
            getSignaturesForAddress: vi.fn().mockResolvedValue([]),
            getTransaction: vi.fn().mockResolvedValue(null),
            getLatestBlockhash: vi.fn().mockResolvedValue({
                blockhash: 'BlockHash1111111111111111111111111111111111',
                lastValidBlockHeight: 100,
            }),
            confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
        },
        makeChain,
    }
})

vi.mock('@solana/web3.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@solana/web3.js')>()
    return { ...actual, Connection: vi.fn().mockImplementation(function () { return mocks.connection }) }
})

vi.mock('@coral-xyz/anchor', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@coral-xyz/anchor')>()
    const MockAnchorProvider: any = vi.fn().mockImplementation(function () { return {} })
    MockAnchorProvider.defaultOptions = actual.AnchorProvider.defaultOptions
    return {
        ...actual,
        AnchorProvider: MockAnchorProvider,
        Program: vi.fn().mockImplementation(function () { return mocks.program }),
    }
})

vi.mock('@solana/spl-token', () => ({
    getAssociatedTokenAddress: vi.fn().mockResolvedValue('MockTokenAccount'),
    TOKEN_PROGRAM_ID: 'MockTokenProgram',
    ASSOCIATED_TOKEN_PROGRAM_ID: 'MockAssocTokenProgram',
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

const mockApiClient = {} as TrainApiClient

describe('SolanaHTLCClient', () => {
    let client: SolanaHTLCClient
    let sendTransaction: ReturnType<typeof vi.fn>

    beforeEach(() => {
        mocks.program.programId = new PublicKey(CONTRACT)
        vi.clearAllMocks()
        mocks.connection.getAccountInfo.mockResolvedValue(null)
        mocks.connection.getSignaturesForAddress.mockResolvedValue([])
        mocks.connection.getTransaction.mockResolvedValue(null)
        mocks.connection.getLatestBlockhash.mockResolvedValue({ blockhash: BLOCKHASH, lastValidBlockHeight: 100 })
        mocks.connection.confirmTransaction.mockResolvedValue({ value: { err: null } })
        mocks.program.coder.events.decode.mockReturnValue(null)
        mocks.program.methods.userLockSol.mockReturnValue(mocks.makeChain())
        mocks.program.methods.userLockToken.mockReturnValue(mocks.makeChain())
        mocks.program.methods.refundUserSol.mockReturnValue(mocks.makeChain())
        mocks.program.methods.refundUserToken.mockReturnValue(mocks.makeChain())
        mocks.program.methods.closeUserLock.mockReturnValue(mocks.makeChain())
        mocks.program.methods.redeemSolverSol.mockReturnValue(mocks.makeChain())
        mocks.program.methods.redeemSolverToken.mockReturnValue(mocks.makeChain())
        mocks.program.methods.getSolverLockCount.mockReturnValue({ view: vi.fn().mockResolvedValue(0) })
        mocks.program.account.solverLock.fetch.mockResolvedValue(null)

        sendTransaction = vi.fn().mockResolvedValue(SIGNATURE)
        client = new SolanaHTLCClient({
            rpcUrl: 'https://api.devnet.solana.com',
            apiClient: mockApiClient,
            signer: { publicKey: SIGNER_KEY, sendTransaction: sendTransaction as any },
        })
    })

    // ── getUserLockDetails ───────────────────────────────────────────────────

    describe('getUserLockDetails', () => {
        const baseParams = {
            id: HASHLOCK,
            contractAddress: CONTRACT,
            chainId: null,
            decimals: 6,
        }

        it('throws when contractAddress is missing', async () => {
            await expect(
                client.getUserLockDetails({ ...baseParams, contractAddress: '' })
            ).rejects.toThrow('No contract address')
        })

        it('returns null when account not found and no past signatures', async () => {
            const result = await client.getUserLockDetails(baseParams)
            expect(result).toBeNull()
        })

        it('returns LockDetails for an active SOL lock', async () => {
            mocks.connection.getAccountInfo.mockResolvedValue({ data: Buffer.from([]) })
            mocks.program.account.userLock.fetch.mockResolvedValue({
                amount: new BN(2_000_000),
                timelock: new BN(1_700_000_000),
                sender: new PublicKey(SENDER_KEY),
                recipient: new PublicKey(RECIPIENT_KEY),
                secret: new Array(32).fill(0),
                tokenMint: new PublicKey('11111111111111111111111111111111'),
                status: LockStatus.Pending,
            })

            const result = await client.getUserLockDetails(baseParams)

            expect(result).toMatchObject({
                hashlock: HASHLOCK,
                amount: 2,
                timelock: 1_700_000_000,
                sender: SENDER_KEY,
                recipient: RECIPIENT_KEY,
                secret: undefined,
                token: undefined,
                status: LockStatus.Pending,
            })
        })

        it('returns LockDetails with token address for a token lock', async () => {
            mocks.connection.getAccountInfo.mockResolvedValue({ data: Buffer.from([]) })
            mocks.program.account.userLock.fetch.mockResolvedValue({
                amount: new BN(5_000_000),
                timelock: new BN(1_700_000_000),
                sender: new PublicKey(SENDER_KEY),
                recipient: new PublicKey(RECIPIENT_KEY),
                secret: new Array(32).fill(0),
                tokenMint: new PublicKey(TOKEN_MINT),
                status: 0,
            })

            const result = await client.getUserLockDetails(baseParams)

            expect(result?.token).toBe(TOKEN_MINT)
            expect(result?.amount).toBe(5)
        })

        it('returns Refunded status from closed account logs (Program data prefix)', async () => {
            mocks.connection.getSignaturesForAddress.mockResolvedValue([{ signature: 'closedTxSig' }])
            mocks.connection.getTransaction.mockResolvedValue({
                blockTime: 1_700_000_000,
                meta: { logMessages: ['Program data: encodedEvent'] },
            })
            mocks.program.coder.events.decode.mockReturnValue({ name: 'UserRefunded', data: {} })

            const result = await client.getUserLockDetails(baseParams)

            expect(result).toMatchObject({
                hashlock: HASHLOCK,
                status: LockStatus.Refunded,
                blockTimestamp: 1_700_000_000_000,
            })
        })

        it('returns Redeemed status from closed account logs (Program log prefix)', async () => {
            mocks.connection.getSignaturesForAddress.mockResolvedValue([{ signature: 'closedTxSig' }])
            mocks.connection.getTransaction.mockResolvedValue({
                blockTime: 1_700_000_000,
                meta: { logMessages: ['Program log: encodedEvent'] },
            })
            mocks.program.coder.events.decode.mockReturnValue({ name: 'UserRedeemed', data: {} })

            const result = await client.getUserLockDetails(baseParams)

            expect(result?.status).toBe(LockStatus.Redeemed)
        })

        it('returns null when account is closed but logs contain no matching event', async () => {
            mocks.connection.getSignaturesForAddress.mockResolvedValue([{ signature: 'closedTxSig' }])
            mocks.connection.getTransaction.mockResolvedValue({
                blockTime: 1_700_000_000,
                meta: { logMessages: ['Program data: encodedEvent'] },
            })
            // decode returns null — no matching event
            mocks.program.coder.events.decode.mockReturnValue(null)

            const result = await client.getUserLockDetails(baseParams)

            expect(result).toBeNull()
        })

        it('returns null when program fetch throws', async () => {
            mocks.connection.getAccountInfo.mockResolvedValue({ data: Buffer.from([]) })
            mocks.program.account.userLock.fetch.mockRejectedValue(new Error('RPC error'))

            const result = await client.getUserLockDetails(baseParams)

            expect(result).toBeNull()
        })
    })

    // ── refund ───────────────────────────────────────────────────────────────

    describe('refund', () => {
        const baseParams = {
            type: 'native' as const,
            id: HASHLOCK,
            contractAddress: CONTRACT,
            chainId: null,
            sourceAsset: { symbol: 'SOL', contractAddress: '', decimals: 9 },
        }

        it('throws when signer is not configured', async () => {
            const noSignerClient = new SolanaHTLCClient({
                rpcUrl: 'https://api.devnet.solana.com',
                apiClient: mockApiClient,
            })
            await expect(noSignerClient.refund(baseParams)).rejects.toThrow('Solana signer not configured')
        })

        it('throws when contractAddress is missing', async () => {
            await expect(
                client.refund({ ...baseParams, contractAddress: '' })
            ).rejects.toThrow('No contract address')
        })

        it('returns signature for SOL refund', async () => {
            const result = await client.refund(baseParams)

            expect(result).toBe(SIGNATURE)
            expect(mocks.program.methods.refundUserSol).toHaveBeenCalled()
            expect(mocks.program.methods.closeUserLock).toHaveBeenCalled()
            expect(sendTransaction).toHaveBeenCalledOnce()
        })

        it('returns signature for token refund', async () => {
            const result = await client.refund({
                ...baseParams,
                type: 'erc20',
                sourceAsset: { symbol: 'USDC', contractAddress: TOKEN_MINT, decimals: 6 },
            })

            expect(result).toBe(SIGNATURE)
            expect(mocks.program.methods.refundUserToken).toHaveBeenCalled()
            expect(mocks.program.methods.closeUserLock).toHaveBeenCalled()
        })

        it('throws when transaction confirmation reports an error', async () => {
            mocks.connection.confirmTransaction.mockResolvedValue({ value: { err: 'InstructionError' } })

            await expect(client.refund(baseParams)).rejects.toThrow('InstructionError')
        })
    })

    // ── userLock ──────────────────────────────────────────────────────────────

    describe('userLock', () => {
        const baseParams = {
            destinationChain: 'eip155:1',
            sourceChain: 'solana:devnet',
            amount: '2.0',
            destinationAmount: '2000000000000000000',
            decimals: 9,
            destinationAsset: '0xdsttoken',
            sourceAsset: { contractAddress: '', symbol: 'SOL', decimals: 9 },
            destLpAddress: RECIPIENT_KEY,
            srcLpAddress: RECIPIENT_KEY,
            atomicContract: CONTRACT,
            sourceAddress: SIGNER_KEY,
            destinationAddress: '0xdestaddr',
            hashlock: HASHLOCK,
            nonce: 1700000000000,
            quoteExpiry: 1700001000,
            timelockDelta: 150,
        } as any

        it('throws when signer is not configured', async () => {
            const noSignerClient = new SolanaHTLCClient({
                rpcUrl: 'https://api.devnet.solana.com',
                apiClient: mockApiClient,
            })
            await expect(noSignerClient.userLock(baseParams)).rejects.toThrow('Solana signer not configured')
        })

        it('throws when contractAddress is missing', async () => {
            await expect(
                client.userLock({ ...baseParams, atomicContract: '' })
            ).rejects.toThrow('No contract address')
        })

        it('returns hash, hashlock, and nonce for SOL lock', async () => {
            const result = await client.userLock(baseParams)

            expect(result.hash).toBe(SIGNATURE)
            expect(result.hashlock).toBe(HASHLOCK)
            expect(result.nonce).toBe(1700000000000)
            expect(mocks.program.methods.userLockSol).toHaveBeenCalled()
            expect(sendTransaction).toHaveBeenCalledOnce()
        })

        it('uses userLockToken for token locks', async () => {
            const result = await client.userLock({
                ...baseParams,
                sourceAsset: { contractAddress: TOKEN_MINT, symbol: 'USDC', decimals: 6 },
            })

            expect(result.hash).toBe(SIGNATURE)
            expect(mocks.program.methods.userLockToken).toHaveBeenCalled()
        })

        it('throws when transaction confirmation reports an error', async () => {
            mocks.connection.confirmTransaction.mockResolvedValue({ value: { err: 'InstructionError' } })

            await expect(client.userLock(baseParams)).rejects.toThrow('InstructionError')
        })

        it('propagates sendTransaction errors', async () => {
            sendTransaction.mockRejectedValueOnce(new Error('wallet rejected'))

            await expect(client.userLock(baseParams)).rejects.toThrow('wallet rejected')
        })
    })

    // ── redeemSolver ─────────────────────────────────────────────────────────

    describe('redeemSolver', () => {
        const baseParams = {
            id: HASHLOCK,
            contractAddress: CONTRACT,
            secret: '12345' as string | bigint,
            type: 'native' as const,
            chainId: 'solana:devnet',
            sourceAsset: { contractAddress: '', symbol: 'SOL', decimals: 9 },
            destLpAddress: RECIPIENT_KEY,
        }

        beforeEach(() => {
            // redeemSolverTransactionBuilder fetches the solver lock account
            mocks.program.account.solverLock.fetch.mockResolvedValue({
                rewardRecipient: new PublicKey(RECIPIENT_KEY),
                recipient: new PublicKey(SIGNER_KEY),
            })
        })

        it('throws when signer is not configured', async () => {
            const noSignerClient = new SolanaHTLCClient({
                rpcUrl: 'https://api.devnet.solana.com',
                apiClient: mockApiClient,
            })
            await expect(noSignerClient.redeemSolver(baseParams)).rejects.toThrow('Solana signer not configured')
        })

        it('throws when contractAddress is missing', async () => {
            await expect(
                client.redeemSolver({ ...baseParams, contractAddress: '' })
            ).rejects.toThrow('No contract address')
        })

        it('returns signature for SOL redemption', async () => {
            const result = await client.redeemSolver(baseParams)

            expect(result).toBe(SIGNATURE)
            expect(mocks.program.methods.redeemSolverSol).toHaveBeenCalled()
            expect(sendTransaction).toHaveBeenCalledOnce()
        })

        it('uses redeemSolverToken for token redemptions', async () => {
            const result = await client.redeemSolver({
                ...baseParams,
                type: 'erc20',
                sourceAsset: { contractAddress: TOKEN_MINT, symbol: 'USDC', decimals: 6 },
            })

            expect(result).toBe(SIGNATURE)
            expect(mocks.program.methods.redeemSolverToken).toHaveBeenCalled()
        })

        it('throws when transaction confirmation reports an error', async () => {
            mocks.connection.confirmTransaction.mockResolvedValue({ value: { err: 'InstructionError' } })

            await expect(client.redeemSolver(baseParams)).rejects.toThrow('InstructionError')
        })
    })

    // ── _getSolverLockDetails ────────────────────────────────────────────────

    describe('_getSolverLockDetails', () => {
        const baseParams = {
            id: HASHLOCK,
            contractAddress: CONTRACT,
            chainId: null,
            decimals: 9,
        }
        const nodeUrl = 'https://api.devnet.solana.com'

        it('throws when contractAddress is missing', async () => {
            await expect(
                client._getSolverLockDetails({ ...baseParams, contractAddress: '' }, nodeUrl)
            ).rejects.toThrow('No contract address')
        })

        it('returns null when count is 0', async () => {
            const result = await client._getSolverLockDetails(baseParams, nodeUrl)
            expect(result).toBeNull()
        })

        it('returns first valid solver lock', async () => {
            mocks.program.methods.getSolverLockCount.mockReturnValue({
                view: vi.fn().mockResolvedValue(1),
            })
            mocks.program.account.solverLock.fetch.mockResolvedValue({
                amount: new BN(2_000_000_000),
                reward: new BN(0),
                timelock: new BN(1_700_000_000),
                rewardTimelock: new BN(0),
                sender: new PublicKey(SENDER_KEY),
                recipient: new PublicKey(RECIPIENT_KEY),
                rewardRecipient: new PublicKey(RECIPIENT_KEY),
                secret: new Array(32).fill(0),
                tokenMint: new PublicKey('11111111111111111111111111111111'),
                rewardTokenMint: new PublicKey('11111111111111111111111111111111'),
                status: LockStatus.Pending,
            })

            const result = await client._getSolverLockDetails(baseParams, nodeUrl)

            expect(result).not.toBeNull()
            expect(result!.hashlock).toBe(HASHLOCK)
            expect(result!.sender).toBe(SENDER_KEY)
            expect(result!.status).toBe(LockStatus.Pending)
            expect(result!.index).toBe(1)
            expect(result!.token).toBeUndefined() // native SOL
        })

        it('skips empty slots (native address sender)', async () => {
            mocks.program.methods.getSolverLockCount.mockReturnValue({
                view: vi.fn().mockResolvedValue(2),
            })
            // First: empty slot
            mocks.program.account.solverLock.fetch
                .mockResolvedValueOnce({
                    amount: new BN(0),
                    reward: new BN(0),
                    timelock: new BN(0),
                    rewardTimelock: new BN(0),
                    sender: new PublicKey('11111111111111111111111111111111'),
                    recipient: new PublicKey('11111111111111111111111111111111'),
                    rewardRecipient: new PublicKey('11111111111111111111111111111111'),
                    secret: new Array(32).fill(0),
                    tokenMint: new PublicKey('11111111111111111111111111111111'),
                    rewardTokenMint: new PublicKey('11111111111111111111111111111111'),
                    status: 0,
                })
                // Second: valid
                .mockResolvedValueOnce({
                    amount: new BN(1_000_000_000),
                    reward: new BN(0),
                    timelock: new BN(1_700_000_000),
                    rewardTimelock: new BN(0),
                    sender: new PublicKey(SENDER_KEY),
                    recipient: new PublicKey(RECIPIENT_KEY),
                    rewardRecipient: new PublicKey(RECIPIENT_KEY),
                    secret: new Array(32).fill(0),
                    tokenMint: new PublicKey('11111111111111111111111111111111'),
                    rewardTokenMint: new PublicKey('11111111111111111111111111111111'),
                    status: LockStatus.Pending,
                })

            const result = await client._getSolverLockDetails(baseParams, nodeUrl)

            expect(result).not.toBeNull()
            expect(result!.index).toBe(2)
            expect(result!.sender).toBe(SENDER_KEY)
        })

        it('filters by solverAddress', async () => {
            mocks.program.methods.getSolverLockCount.mockReturnValue({
                view: vi.fn().mockResolvedValue(1),
            })
            mocks.program.account.solverLock.fetch.mockResolvedValue({
                amount: new BN(1_000_000_000),
                reward: new BN(0),
                timelock: new BN(1_700_000_000),
                rewardTimelock: new BN(0),
                sender: new PublicKey(SENDER_KEY),
                recipient: new PublicKey(RECIPIENT_KEY),
                rewardRecipient: new PublicKey(RECIPIENT_KEY),
                secret: new Array(32).fill(0),
                tokenMint: new PublicKey('11111111111111111111111111111111'),
                rewardTokenMint: new PublicKey('11111111111111111111111111111111'),
                status: LockStatus.Pending,
            })

            const result = await client._getSolverLockDetails(
                { ...baseParams, solverAddress: 'NonMatchingAddress' },
                nodeUrl,
            )

            expect(result).toBeNull()
        })

        it('returns token address for non-native mints', async () => {
            mocks.program.methods.getSolverLockCount.mockReturnValue({
                view: vi.fn().mockResolvedValue(1),
            })
            mocks.program.account.solverLock.fetch.mockResolvedValue({
                amount: new BN(5_000_000),
                reward: new BN(100_000),
                timelock: new BN(1_700_000_000),
                rewardTimelock: new BN(1_700_001_000),
                sender: new PublicKey(SENDER_KEY),
                recipient: new PublicKey(RECIPIENT_KEY),
                rewardRecipient: new PublicKey(RECIPIENT_KEY),
                secret: new Array(32).fill(0),
                tokenMint: new PublicKey(TOKEN_MINT),
                rewardTokenMint: new PublicKey(TOKEN_MINT),
                status: LockStatus.Pending,
            })

            const result = await client._getSolverLockDetails(baseParams, nodeUrl)

            expect(result!.token).toBe(TOKEN_MINT)
            expect(result!.rewardToken).toBe(TOKEN_MINT)
        })

        it('handles fetch errors gracefully', async () => {
            mocks.program.methods.getSolverLockCount.mockReturnValue({
                view: vi.fn().mockResolvedValue(1),
            })
            mocks.program.account.solverLock.fetch.mockRejectedValue(new Error('RPC error'))

            const result = await client._getSolverLockDetails(baseParams, nodeUrl)

            expect(result).toBeNull()
        })

        it('returns secret when non-zero', async () => {
            mocks.program.methods.getSolverLockCount.mockReturnValue({
                view: vi.fn().mockResolvedValue(1),
            })
            const secretBytes = new Array(32).fill(0)
            secretBytes[31] = 42

            mocks.program.account.solverLock.fetch.mockResolvedValue({
                amount: new BN(1_000_000_000),
                reward: new BN(0),
                timelock: new BN(1_700_000_000),
                rewardTimelock: new BN(0),
                sender: new PublicKey(SENDER_KEY),
                recipient: new PublicKey(RECIPIENT_KEY),
                rewardRecipient: new PublicKey(RECIPIENT_KEY),
                secret: secretBytes,
                tokenMint: new PublicKey('11111111111111111111111111111111'),
                rewardTokenMint: new PublicKey('11111111111111111111111111111111'),
                status: LockStatus.Redeemed,
            })

            const result = await client._getSolverLockDetails(baseParams, nodeUrl)

            expect(result!.secret).toBeDefined()
            expect(typeof result!.secret).toBe('bigint')
            expect(result!.status).toBe(LockStatus.Redeemed)
        })
    })

    // ── recoverSwap ──────────────────────────────────────────────────────────

    describe('recoverSwap', () => {
        it('throws not supported', async () => {
            await expect(client.recoverSwap('0xabc')).rejects.toThrow(
                'recoverSwap is not supported for Solana'
            )
        })
    })
})
