import { formatUnits, bytesToHex, type LockDetails, type LockStatus } from '@train-protocol/sdk'

export function parseSecret(rawSecret: unknown): bigint | undefined {
    const secretBytes: number[] = Array.from((rawSecret as number[]) || [])
    const secretHex = secretBytes.length > 0 ? bytesToHex(secretBytes) : '0x0'
    const secretBigInt = BigInt(secretHex)
    return secretBigInt !== 0n ? secretBigInt : undefined
}

export function resolveLock(result: any, id: string, tokenDecimals: number): LockDetails | null {
    const status = Number(result.status) as LockStatus
    if (status === 0) return null

    const isSolverLock = 'reward' in result

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), tokenDecimals)),
        sender: result.sender?.toString(),
        recipient: result.recipient?.toString(),
        token: result.token?.toString(),
        timelock: Number(result.timelock),
        secret: parseSecret(result.secret),
        status,
        ...(isSolverLock ? {
            reward: Number(result.reward),
            rewardTimelock: Number(result.reward_timelock),
            rewardRecipient: result.reward_recipient?.toString(),
            rewardToken: result.reward_token?.toString(),
        } : {}),
    }
}
