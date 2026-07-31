import { AnchorProvider, Program, type Wallet } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import { describe, expect, it } from 'vitest'
import type { UserLockParams } from '@train-protocol/sdk'
import { buildUserLockTx } from '../client/wallet/buildUserLockTx'
import { NATIVE_SOL_ADDRESS } from '../constants'
import { TrainHtlc } from '../idl/trainHtlc'

const PROGRAM_ID = '2cQYFAiud2LBg3r6MxKPJ1oS83yyrRwDsgxQSwhL97LJ'
const PAYOUT_CURVE = 'Dp4ReoYGG8VRXpnst4vT8g6UDVwUicJwAuiikQWk8HMF'

function createProgram(connection: Connection, publicKey: PublicKey): Program {
    const wallet = {
        publicKey,
        signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) => tx,
        signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]) => txs,
    } as unknown as Wallet
    return new Program(
        TrainHtlc(PROGRAM_ID),
        new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions()),
    )
}

describe('Solana transaction builders', () => {
    it('encodes the new structured user-lock params and raw solver signature bytes', async () => {
        const wallet = PublicKey.unique()
        const solver = PublicKey.unique()
        const connection = {
            getLatestBlockhash: async () => ({
                blockhash: PublicKey.unique().toBase58(),
                lastValidBlockHeight: 123,
            }),
        } as Connection
        const program = createProgram(connection, wallet)

        const params: UserLockParams = {
            sourceChain: 'solana:devnet',
            destinationChain: 'eip155:11155111',
            amount: '1',
            destinationAmount: '5000000',
            sourceAsset: { symbol: 'SOL', contract: NATIVE_SOL_ADDRESS, decimals: 9 },
            destinationAsset: {
                symbol: 'USDC',
                contract: '0x0000000000000000000000000000000000000001',
                decimals: 6,
            },
            srcSolverAddress: solver.toBase58(),
            destSolverAddress: '0x0000000000000000000000000000000000000002',
            atomicContract: PROGRAM_ID,
            sourceAddress: wallet.toBase58(),
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
            hashlock: `0x${'11'.repeat(32)}`,
            nonce: 123456,
        }

        const transaction = await buildUserLockTx(connection, program, wallet, params)
        const decoder = program.coder.instruction as unknown as { decode(data: Buffer): any }
        const decoded = decoder.decode(transaction.instructions[0].data)

        expect(decoded?.name).toBe('userLockSol')
        expect(decoded?.data.params.recipient.toBase58()).toBe(solver.toBase58())
        expect(decoded?.data.params.refundTo.toBase58()).toBe(wallet.toBase58())
        expect(decoded?.data.params.payoutCurve.toBase58()).toBe(PAYOUT_CURVE)
        expect([...decoded?.data.params.payoutCurveData]).toEqual([0x12, 0x34])
        expect(decoded?.data.params.dstAmount.toString()).toBe('5000000')
        expect([...decoded?.data.solverData]).toEqual([0xab, 0xcd])
        expect(Buffer.from(decoded?.data.userData).toString()).toBe('123456')
    })
})
