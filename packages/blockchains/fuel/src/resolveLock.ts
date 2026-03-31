import { DateTime } from 'fuels'
import { formatUnits, type LockDetails, LockStatus } from '@train-protocol/sdk'

const ZERO_B256 = '0x' + '0'.repeat(64)

export { ZERO_B256 }

export function mapLockStatus(status: number): LockStatus {
    switch (status) {
        case 0: return LockStatus.Pending
        case 1: return LockStatus.Redeemed
        case 2: return LockStatus.Refunded
        default: return LockStatus.Empty
    }
}

export function resolveLock(result: any, id: string, tokenDecimals: number): LockDetails | null {
    const sender = result.sender?.bits ?? null
    if (!sender || sender === ZERO_B256) return null

    const timelock = result.timelock
        ? DateTime.fromTai64(result.timelock).toUnixSeconds()
        : 0

    const isSolverLock = 'reward' in result

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), tokenDecimals)),
        secret: result.secret && result.secret !== 0n ? BigInt(result.secret) : undefined,
        sender,
        recipient: result.srcReceiver?.bits ?? undefined,
        timelock,
        status: mapLockStatus(Number(result.claimed ?? result.status ?? 0)),
        ...(isSolverLock ? {
            reward: Number(result.reward),
            rewardTimelock: result.rewardTimelock
                ? DateTime.fromTai64(result.rewardTimelock).toUnixSeconds()
                : undefined,
        } : {}),
    }
}
