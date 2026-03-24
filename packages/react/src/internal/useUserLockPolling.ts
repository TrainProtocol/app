import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LockStatus } from '@train-protocol/sdk'
import type { IHTLCClient, LockParams } from '@train-protocol/sdk'
import type { SwapStore } from './store'
import { trainQueryKeys } from './queryKeys'

export interface UseUserLockPollingOptions {
    client: IHTLCClient | null
    params: LockParams | null
    hashlock: string | null
    enabled: boolean
    store: SwapStore | null
}

/**
 * Polls the source chain for user lock details every 3 seconds.
 * Writes directly to the store. Stops when the lock status is Redeemed.
 */
export function useUserLockPolling(options: UseUserLockPollingOptions) {
    const { client, params, hashlock, enabled, store } = options

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

    useEffect(() => {
        if (query.data && store && hashlock) {
            store.getState().setSourceDetails(hashlock, query.data)
        }
    }, [query.data, store, hashlock])
}
