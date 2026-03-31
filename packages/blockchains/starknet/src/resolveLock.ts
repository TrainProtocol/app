import { formatUnits, type LockDetails, LockStatus } from '@train-protocol/sdk'
import { ZERO_ADDRESS } from './constants.js'
import { formatStarknetAddress } from './utils.js'

export function mapLockStatus(cairoStatus: any): LockStatus {
    // CairoCustomEnum — activeVariant is a METHOD, must be called
    if (typeof cairoStatus?.activeVariant === 'function') {
        const variant = cairoStatus.activeVariant() as string
        switch (variant) {
            case 'Pending': return LockStatus.Pending
            case 'Redeemed': return LockStatus.Redeemed
            case 'Refunded': return LockStatus.Refunded
            default: return LockStatus.Empty
        }
    }
    // Fallback: plain number/bigint
    if (typeof cairoStatus === 'number' || typeof cairoStatus === 'bigint') {
        return Number(cairoStatus) as LockStatus
    }
    // Fallback: { variant: { Refunded: {}, ... } } — active key has an object value
    if (cairoStatus?.variant && typeof cairoStatus.variant === 'object') {
        const variantKey = Object.keys(cairoStatus.variant).find(
            k => cairoStatus.variant[k] !== undefined
        )
        switch (variantKey) {
            case 'Pending': return LockStatus.Pending
            case 'Redeemed': return LockStatus.Redeemed
            case 'Refunded': return LockStatus.Refunded
            default: return LockStatus.Empty
        }
    }
    return LockStatus.Empty
}

export function resolveLock(result: any, id: string, tokenDecimals: number): LockDetails | null {
    const sender = '0x' + BigInt(result.sender).toString(16)
    if (sender === ZERO_ADDRESS || BigInt(result.sender) === 0n) return null

    const isSolverLock = 'reward' in result

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), tokenDecimals)),
        secret: BigInt(result.secret) !== 0n ? BigInt(result.secret) : undefined,
        sender,
        recipient: BigInt(result.recipient) !== 0n ? formatStarknetAddress('0x' + BigInt(result.recipient).toString(16)) : undefined,
        token: BigInt(result.token) !== 0n ? formatStarknetAddress('0x' + BigInt(result.token).toString(16)) : undefined,
        timelock: Number(result.timelock),
        status: mapLockStatus(result.status),
        ...(isSolverLock ? {
            reward: Number(result.reward),
            rewardTimelock: Number(result.reward_timelock),
            rewardRecipient: BigInt(result.reward_recipient) !== 0n ? '0x' + BigInt(result.reward_recipient).toString(16) : undefined,
            rewardToken: BigInt(result.reward_token) !== 0n ? '0x' + BigInt(result.reward_token).toString(16) : undefined,
        } : {}),
    }
}
