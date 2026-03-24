import { useRef, useMemo, useEffect } from 'react'
import type { HTLCFromApi, HTLCFromApiResponse, OrderStreamEvent, TransactionCreatedEventData, StatusChangedEventData } from '@train-protocol/sdk'
import type { SwapStore } from './store'
import { useEventSource } from './useEventSource'

export interface UseOrderStreamOptions {
    baseUrl: string
    solverId: string | undefined
    hashlock: string | undefined
    enabled: boolean
    store: SwapStore | null
    onFailed?: (reason: string) => void
}

/**
 * SSE stream for order events from Station API.
 * Writes to store.orderData. Accumulates transactions from order_event messages.
 */
export function useOrderStream(options: UseOrderStreamOptions) {
    const { baseUrl, solverId, hashlock, enabled, store, onFailed } = options
    const onFailedRef = useRef(onFailed)
    onFailedRef.current = onFailed
    const accumulatedTxsRef = useRef<HTLCFromApi['transactions']>([])

    // Reset accumulated state when stream params change (new swap)
    useEffect(() => {
        accumulatedTxsRef.current = []
    }, [solverId, hashlock])

    const url = solverId && hashlock
        ? `${baseUrl}/api/v1/orders/${encodeURIComponent(solverId)}/${encodeURIComponent(hashlock)}/stream`
        : null

    const eventHandlers = useMemo(() => ({
        order: (data: unknown) => {
            if (!hashlock) return
            const response = data as HTLCFromApiResponse
            const order = response.order
            const merged = {
                ...order,
                transactions: [
                    ...(order.transactions ?? []),
                    ...accumulatedTxsRef.current,
                ],
            }
            store?.getState().setOrderData(hashlock, merged)
        },
        order_event: (data: unknown) => {
            if (!hashlock) return
            const event = data as OrderStreamEvent
            if (event.eventType === 'order.transaction_created') {
                const txData = event.data as TransactionCreatedEventData
                const tx = {
                    type: txData.transactionType as any,
                    hash: txData.transactionHash,
                    network: txData.networkId,
                }
                accumulatedTxsRef.current = [...accumulatedTxsRef.current, tx]

                const currentOrder = store?.getState().orderData[hashlock]
                if (currentOrder) {
                    store?.getState().setOrderData(hashlock, {
                        ...currentOrder,
                        transactions: [...(currentOrder.transactions ?? []), tx],
                    })
                }
            } else if (event.eventType === 'order.status_changed') {
                const statusData = event.data as StatusChangedEventData
                if (statusData.status === 'failed') {
                    onFailedRef.current?.(statusData.failureReason ?? 'Please wait for the timelock to expire, then refund to receive your assets back.')
                }
            }
        },
        done: (_data: unknown) => {
            return 'close' as const
        },
    }), [store, hashlock])

    useEventSource(url, {
        enabled: enabled && !!url,
        onEvent: eventHandlers,
    })
}
