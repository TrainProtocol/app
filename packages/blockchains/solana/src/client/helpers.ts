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
