import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { HTLCFromApiResponse } from '@train-protocol/sdk'
import type { SwapStore } from './store'
import { useTrainContext } from '../providers/TrainContext'
import { trainQueryKeys } from './queryKeys'

export interface UseOrderPollingOptions {
    solverAddress: string | undefined
    hashlock: string | undefined
    enabled: boolean
    store: SwapStore | null
    onFailed?: (reason: string) => void
}

const DEFAULT_FAILURE_REASON =
    'Please wait for the timelock to expire, then refund to receive your assets back.'

/**
 * Polling fallback for order data from Station API.
 * Drop-in replacement for `useOrderStream` while the SSE stream is unstable.
 * Writes to store.orderData on each successful poll. Fires onFailed exactly
 * once when the order status flips to 'failed'.
 */
export function useOrderPolling(options: UseOrderPollingOptions) {
    const { solverAddress, hashlock, enabled, store, onFailed } = options
    const { apiClient } = useTrainContext()

    const onFailedRef = useRef(onFailed)
    onFailedRef.current = onFailed

    const failureFiredRef = useRef(false)

    useEffect(() => {
        failureFiredRef.current = false
    }, [hashlock, solverAddress])

    useQuery<HTLCFromApiResponse | null>({
        queryKey: trainQueryKeys.order(hashlock ?? '', solverAddress),
        queryFn: async () => {
            if (!hashlock) return null
            const response = await apiClient.getOrder(hashlock, solverAddress)
            const order = response.order
            store?.getState().setOrderData(hashlock, order)

            if (order.status === 'failed' && !failureFiredRef.current) {
                failureFiredRef.current = true
                onFailedRef.current?.(order.failureReason ?? DEFAULT_FAILURE_REASON)
            }

            return response
        },
        enabled: enabled && !!hashlock,
        refetchInterval: 3000,
        retry: false,
        staleTime: 0,
        gcTime: Infinity,
        structuralSharing: false,
    })
}
