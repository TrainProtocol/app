import { useQuery } from '@tanstack/react-query'
import { LockStatus } from '@train-protocol/sdk'
import type { IHTLCClient, LockParams, UserLockDetails } from '@train-protocol/sdk'
import { trainQueryKeys } from './queryKeys'

export interface UseUserLockPollingOptions {
    client: IHTLCClient | null
    params: LockParams | null
    enabled: boolean
}

/**
 * Polls the source chain for user lock details every 3 seconds.
 * Returns data directly via React Query — no store writes.
 * Stops when the lock status is Redeemed.
 */
export function useUserLockPolling(options: UseUserLockPollingOptions): UserLockDetails | null {
    const { client, params, enabled } = options

    const query = useQuery({
        queryKey: trainQueryKeys.userLock(params?.id ?? ''),
        queryFn: async () => {
            if (!client || !params) return null
            return client.getUserLockDetails(params)
        },
        enabled: enabled && !!client && !!params,
        refetchInterval: (query) => {
            if (query.state.data?.status === LockStatus.Redeemed) return false
            return 3000
        },
        retry: false,
        staleTime: 0,
        gcTime: 0,
    })

    return query.data ?? null
}
