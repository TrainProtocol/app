import { useCallback } from 'react'
import { LockStatus } from '@train-protocol/sdk'
import type { IHTLCClient, UserLockDetails, LockParams } from '@train-protocol/sdk'
import { usePolling } from './usePolling'

export interface UseUserLockPollingOptions {
    client: IHTLCClient | null
    params: LockParams | null
    enabled: boolean
    onSuccess?: (details: UserLockDetails) => void
}

/**
 * Polls the source chain for user lock details every 3 seconds.
 * Stops when the lock status is Redeemed.
 */
export function useUserLockPolling(options: UseUserLockPollingOptions) {
    const { client, params, enabled, onSuccess } = options

    const fetcher = useCallback(async () => {
        if (!client || !params) return null
        const details = await client.getUserLockDetails(params)
        if (details) onSuccess?.(details)
        return details
    }, [client, params, onSuccess])

    return usePolling(fetcher, {
        interval: 3000,
        enabled: enabled && !!client && !!params,
        shouldStop: (data) => data?.status === LockStatus.Redeemed,
    })
}
