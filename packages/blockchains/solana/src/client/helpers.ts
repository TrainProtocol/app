import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import { bytesToHex } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from '../constants.js'
import { TrainHtlc } from '../idl/trainHtlc.js'

export function parseSecret(secretBytes: Uint8Array | number[]): bigint {
    return BigInt(bytesToHex(Array.from(secretBytes)))
}

export function buildReadOnlyProvider(publicKey: PublicKey, connection: Connection): AnchorProvider {
    const wallet = {
        publicKey,
        signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => tx,
        signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => txs,
    }
    return new AnchorProvider(connection, wallet as Wallet, AnchorProvider.defaultOptions())
}

export function buildProgram(contractAddress: string, connection: Connection, readerKey?: PublicKey): Program {
    const pk = readerKey ?? new PublicKey(NATIVE_SOL_ADDRESS)
    const provider = buildReadOnlyProvider(pk, connection)
    return new Program(TrainHtlc(contractAddress), provider)
}

export function resolvePayoutCurve(address?: string | null): {
    address: PublicKey
    account: PublicKey | null
} {
    if (!address || address === NATIVE_SOL_ADDRESS || /^0x0+$/i.test(address)) {
        return {
            address: new PublicKey(NATIVE_SOL_ADDRESS),
            account: null,
        }
    }

    const publicKey = new PublicKey(address)
    return { address: publicKey, account: publicKey }
}

export async function resolveTokenProgramId(connection: Connection, mint: PublicKey): Promise<PublicKey> {
    const { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token')
    const mintAccount = await connection.getAccountInfo(mint)

    if (!mintAccount) {
        throw new Error(`Solana token mint not found: ${mint.toBase58()}`)
    }
    if (mintAccount.owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID
    if (mintAccount.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID

    throw new Error(`Unsupported Solana token program: ${mintAccount.owner.toBase58()}`)
}
