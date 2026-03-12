import { useCallback } from 'react'
import type { IHTLCClient, LockDetails, LockParams } from '@train-protocol/sdk'
import { usePolling } from './usePolling'

export interface UseSolverLockPollingOptions {
    client: IHTLCClient | null
    params: LockParams | null
    nodeUrls: string[]
    enabled: boolean
    onSuccess?: (details: LockDetails) => void
}

/**
 * Polls the destination chain for solver lock details every 3 seconds.
 */
export function useSolverLockPolling(options: UseSolverLockPollingOptions) {
    const { client, params, nodeUrls, enabled, onSuccess } = options

    const fetcher = useCallback(async () => {
        if (!client || !params) return null
        const details = await client.getSolverLockDetails(params, nodeUrls)
        if (details) onSuccess?.(details)
        return details
    }, [client, params, nodeUrls, onSuccess])

    return usePolling(fetcher, {
        interval: 3000,
        enabled: enabled && !!client && !!params,
    })
}
