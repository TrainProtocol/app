import { PublicKey } from '@solana/web3.js'
import { formatUnits, bytesToHex, type LockDetails, LockStatus } from '@train-protocol/sdk'
import { NATIVE_SOL_ADDRESS } from './constants.js'

export interface UserLockData {
    amount: { toString(): string }
    timelock: { toString(): string }
    sender: PublicKey
    recipient: PublicKey
    secret: number[]
    tokenMint: PublicKey
    status: number
}

export interface SolverLockData extends UserLockData {
    reward: { toString(): string }
    rewardTimelock: { toString(): string }
    rewardRecipient: PublicKey
    rewardTokenMint: PublicKey
}

export function parseSecret(secretBytes: Uint8Array | number[]): bigint | undefined {
    return Array.from(secretBytes).some(b => b !== 0) ? BigInt(bytesToHex(Array.from(secretBytes))) : undefined
}

export function resolveLock(result: UserLockData | SolverLockData, id: string, tokenDecimals: number, rewardTokenDecimals?: number): LockDetails | null {
    const sender = new PublicKey(result.sender).toString()
    if (sender === NATIVE_SOL_ADDRESS) return null

    const isSolverLock = 'reward' in result

    return {
        hashlock: `0x${id.replace('0x', '')}`,
        amount: Number(formatUnits(BigInt(result.amount.toString()), tokenDecimals)),
        timelock: Number(result.timelock),
        sender,
        recipient: new PublicKey(result.recipient).toString(),
        secret: parseSecret(result.secret),
        token: result.tokenMint && result.tokenMint.toString() !== NATIVE_SOL_ADDRESS
            ? result.tokenMint.toString()
            : undefined,
        status: Number(result.status) as LockStatus,
        ...(isSolverLock ? {
            reward: Number(formatUnits(BigInt((result as SolverLockData).reward.toString()), rewardTokenDecimals ?? tokenDecimals)),
            rewardTimelock: Number((result as SolverLockData).rewardTimelock),
            rewardRecipient: new PublicKey((result as SolverLockData).rewardRecipient).toString(),
            rewardToken: (result as SolverLockData).rewardTokenMint && (result as SolverLockData).rewardTokenMint.toString() !== NATIVE_SOL_ADDRESS
                ? (result as SolverLockData).rewardTokenMint.toString()
                : undefined,
        } : {}),
    }
}
