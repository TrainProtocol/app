import { GasProps } from "../../../Models/Balance";
import { Network, getNativeToken, NetworkContractType } from "../../../Models/Network";
import { formatUnits } from "viem";
import { getNetworkRpcUrl } from "../../rpc/resolveNetworkRpcUrl";
import { Connection, PublicKey, Transaction } from "@solana/web3.js"
import { BN, Idl, Program } from "@coral-xyz/anchor"
import { UserLockParams as SdkUserLockParams, parseUnits } from '@train-protocol/sdk'
import { TrainHtlc } from "@train-protocol/solana";

export class SolanaGasProvider {
    supportsNetwork(network: Network): boolean {
        return network.caip2Id.toLowerCase().startsWith('solana')
    }

    getGas = async ({ address, network, token }: GasProps) => {
        if (!address) return

        const atomicContract = network.contracts?.find(c => c.type === NetworkContractType.Train)?.address
        if (!atomicContract) return

        const nativeToken = getNativeToken(network)
        if (!nativeToken) return

        try {
            const lamports = await estimateSolanaGas({
                rpcUrl: getNetworkRpcUrl(network),
                contractAddress: atomicContract,
                address,
                tokenSymbol: token.symbol,
                tokenContractAddress: token.contract,
                decimals: token.decimals ?? 6,
            })

            const gas = lamports ? Number(formatUnits(BigInt(lamports), nativeToken.decimals)) : undefined
            return gas !== undefined ? { gas, token: nativeToken } : undefined
        } catch (e) {
            console.error(e)
        }
    }
}

const NATIVE_SOL_ADDRESS = '11111111111111111111111111111111'

async function estimateSolanaGas(params: {
    rpcUrl: string
    contractAddress: string
    address: string
    tokenSymbol: string
    tokenContractAddress?: string | null
    decimals: number
}): Promise<number | undefined> {
    const { Connection, PublicKey } = await import('@solana/web3.js')
    const { AnchorProvider, Program } = await import('@coral-xyz/anchor')

    const connection = new Connection(params.rpcUrl, 'confirmed')
    const walletPublicKey = new PublicKey(params.address)
    const wallet = {
        publicKey: walletPublicKey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any) => txs,
    }
    const provider = new AnchorProvider(connection, wallet as any, AnchorProvider.defaultOptions())
    const program = new Program(TrainHtlc(params.contractAddress), provider)

    const { transaction } = await userLockTransactionBuilder({
        connection,
        program,
        walletPublicKey,
        hashlock: '0x' + '0'.repeat(64),
        sourceChain: 'solana',
        destinationChain: 'eip155:1',
        destinationAsset: 'ETH',
        destinationAddress: params.address,
        destinationAmount: '1',
        srcLpAddress: 'bD5zQpd6RkbNJDtW7cBf1mw6wHzFxZ71wPCMwAmMh6n',
        sourceAsset: { symbol: params.tokenSymbol, contractAddress: params.tokenContractAddress ?? '', decimals: params.decimals },
        amount: '1',
        decimals: params.decimals,
        timelockDelta: 69,
        quoteExpiry: Math.floor(Date.now() / 1000) + 3600,
        rewardAmount: '0',
        rewardToken: '',
        rewardRecipient: '',
        rewardTimelockDelta: 34,
    } as any)

    const message = transaction.compileMessage()
    const result = await connection.getFeeForMessage(message)
    return result.value ?? undefined
}

type SolanaContext = {
    connection: Connection
    program: Program<Idl>
    walletPublicKey: PublicKey
}
export type UserLockParams = SdkUserLockParams & SolanaContext

export type TransactionResult = {
    transaction: Transaction
    blockhash: string
    lastValidBlockHeight: number
}

const userLockTransactionBuilder = async (params: UserLockParams): Promise<TransactionResult> => {
    const { connection, program, walletPublicKey } = params

    if (!walletPublicKey) throw new Error("Wallet not connected")
    if (!params.srcSolverAddress) throw new Error("No Solver address")
    if (!params.nonce) throw new Error("No nonce")
    if (!params.solverData) throw new Error("No solver data")

    const hashlock = hexToUint8Array(params.hashlock.replace('0x', ''))
    const bnAmount = toBaseUnits(params.amount, params.sourceAsset.decimals)
    const bnDstAmount = new BN(params.destinationAmount)
    const bnRewardAmount = new BN(params.rewardAmount || '0')
    const bnTimelockDelta = new BN(params.timelockDelta || 0)
    const bnRewardTimelockDelta = new BN(params.rewardTimelockDelta || 0)
    const bnQuoteExpiry = new BN(params.quoteExpiry)
    const lpPublicKey = new PublicKey(params.srcSolverAddress)
    const hashlockArray = Array.from(hashlock)
    const userData = Buffer.from(params.nonce.toString())
    const solverDataBytes = Buffer.from(params.solverData ?? '')

    const [userLockPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("user_lock"), hashlock],
        program.programId
    )

    const tx = new Transaction()

    if (params.sourceAsset.contract && params.sourceAsset.contract !== NATIVE_SOL_ADDRESS) {
        const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
        const tokenMint = new PublicKey(params.sourceAsset.contract)
        const senderTokenAccount = await getAssociatedTokenAddress(tokenMint, walletPublicKey)
        const [vault] = PublicKey.findProgramAddressSync(
            [encoder.encode("user_vault"), hashlock],
            program.programId
        )

        const lockTx = await program.methods
            .userLockToken(
                hashlockArray,
                bnAmount, bnTimelockDelta, bnQuoteExpiry,
                walletPublicKey, lpPublicKey,
                params.sourceChain, params.destinationChain, params.destinationAddress,
                bnDstAmount, params.destinationAsset.contract,
                bnRewardAmount, params.rewardToken ?? '', params.rewardRecipient ?? '', bnRewardTimelockDelta,
                userData, solverDataBytes
            )
            .accounts({
                signer: walletPublicKey,
                userLock: userLockPda,
                tokenMint,
                senderTokenAccount,
                vault,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .transaction()

        tx.add(lockTx)
    } else {
        const lockTx = await program.methods
            .userLockSol(
                hashlockArray,
                bnAmount, bnTimelockDelta, bnQuoteExpiry,
                walletPublicKey, lpPublicKey,
                params.sourceChain, params.destinationChain, params.destinationAddress,
                bnDstAmount, params.destinationAsset.contract,
                bnRewardAmount, params.rewardToken ?? '', params.rewardRecipient ?? '', bnRewardTimelockDelta,
                userData, solverDataBytes
            )
            .accounts({
                signer: walletPublicKey,
                userLock: userLockPda,
            })
            .transaction()

        tx.add(lockTx)
    }

    const blockHash = await connection.getLatestBlockhash()
    tx.recentBlockhash = blockHash.blockhash
    tx.lastValidBlockHeight = blockHash.lastValidBlockHeight
    tx.feePayer = walletPublicKey

    return { transaction: tx, blockhash: blockHash.blockhash, lastValidBlockHeight: blockHash.lastValidBlockHeight }
}

function toBaseUnits(amount: string, decimals: number): BN {
    return new BN(parseUnits(amount, decimals).toString())
}

function hexToUint8Array(hex: string): Uint8Array {
    const clean = hex.replace('0x', '')
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16)
    }
    return bytes
}

function secretToUint8Array(secret: string | bigint): Uint8Array {
    if (typeof secret === 'bigint') {
        return hexToUint8Array(secret.toString(16).padStart(64, '0'))
    }
    return hexToUint8Array(secret.replace('0x', ''))
}

function writeBigUInt64LE(value: bigint): Uint8Array {
    const buf = new Uint8Array(8)
    const view = new DataView(buf.buffer)
    view.setBigUint64(0, value, true)
    return buf
}

const encoder = new TextEncoder()