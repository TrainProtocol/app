import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LockStatus, TransactionStatus } from '@train-protocol/sdk'
import type { IHTLCReadClient, LockParams, TransactionInfo, UserLockDetails } from '@train-protocol/sdk'
import { trainQueryKeys } from './queryKeys'

export interface UseUserLockPollingOptions {
    client: IHTLCReadClient | null
    params: LockParams | null
    enabled: boolean
    onTransactionFailed?: (tx: TransactionInfo) => void
}

/**
 * Polls the source chain for user lock details every 3 seconds.
 * Also polls the lock transaction status when a txId is provided and
 * no lock has been found yet — fires onTransactionFailed if the tx reverted.
 * Stops when the lock status is Redeemed or the transaction has failed.
 */
export function useUserLockPolling(options: UseUserLockPollingOptions): UserLockDetails | null {
    const { client, params, enabled, onTransactionFailed } = options
    const txFailedRef = useRef(false)

    const query = useQuery({
        queryKey: trainQueryKeys.userLock(params?.id ?? ''),
        queryFn: async () => {
            if (!client || !params) return null
            return client.getUserLockDetails(params)
        },
        enabled: enabled && !!client && !!params,
        refetchInterval: (query) => {
            if (query.state.data?.status === LockStatus.Redeemed || txFailedRef.current) return false
            return 3000
        },
        retry: false,
        staleTime: 0,
        gcTime: 30_000,
    })

    const lockFound = !!query.data
    const txId = params?.txId
    const shouldPollTx = enabled && !!client && !!txId && !lockFound && !txFailedRef.current

    const txQuery = useQuery({
        queryKey: trainQueryKeys.userLock(`tx:${txId ?? ''}`),
        queryFn: async () => {
            if (!client || !txId) return null
            try {
                return await client.getTransaction(txId)
            } catch {
                return null
            }
        },
        enabled: shouldPollTx,
        refetchInterval: () => shouldPollTx ? 3000 : false,
        retry: false,
        staleTime: 0,
        gcTime: 30_000,
    })

    useEffect(() => {
        if (txQuery.data?.status === TransactionStatus.Failed && !txFailedRef.current) {
            txFailedRef.current = true
            onTransactionFailed?.(txQuery.data)
        }
    }, [txQuery.data, onTransactionFailed])

    return query.data ?? null
}
