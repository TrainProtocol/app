import { formatUnits, type LockDetails, LockStatus } from '@train-protocol/sdk'
import { ZERO_ADDRESS } from './constants.js'

export function resolveLock(result: any, id: string, assetDecimals: number, rewardTokenDecimals?: number): LockDetails | null {
    const isSolverLock = 'reward' in result

    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), assetDecimals)),
        secret: result.secret !== 0n ? BigInt(result.secret) : undefined,
        sender: result.sender,
        recipient: result.recipient !== ZERO_ADDRESS ? result.recipient : undefined,
        token: result.token !== ZERO_ADDRESS ? result.token : undefined,
        timelock: Number(result.timelock),
        status: Number(result.status) as LockStatus,
        ...(isSolverLock ? {
            reward: Number(formatUnits(BigInt(result.reward), rewardTokenDecimals ?? assetDecimals)),
            rewardTimelock: Number(result.rewardTimelock),
            rewardRecipient: result.rewardRecipient !== ZERO_ADDRESS ? result.rewardRecipient : undefined,
            rewardToken: result.rewardToken !== ZERO_ADDRESS ? result.rewardToken : undefined,
        } : {}),
    }
}
