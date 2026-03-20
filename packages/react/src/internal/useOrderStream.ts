import { useRef, useMemo, useEffect } from 'react'
import type { HTLCFromApi, HTLCFromApiResponse, OrderStreamEvent, TransactionCreatedEventData } from '@train-protocol/sdk'
import type { SwapStore } from './store'
import { useEventSource } from './useEventSource'

export interface UseOrderStreamOptions {
    baseUrl: string
    solverId: string | undefined
    hashlock: string | undefined
    enabled: boolean
    store: SwapStore | null
}

/**
 * SSE stream for order events from Station API.
 * Writes directly to the store. Accumulates transactions from order_event messages.
 */
export function useOrderStream(options: UseOrderStreamOptions) {
    const { baseUrl, solverId, hashlock, enabled, store } = options
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
            const response = data as HTLCFromApiResponse
            const orderData = response.order
            const merged = {
                ...orderData,
                transactions: [
                    ...(orderData.transactions ?? []),
                    ...accumulatedTxsRef.current,
                ],
            }
            store?.getState().setHtlcFromApi(merged)
        },
        order_event: (data: unknown) => {
            const event = data as OrderStreamEvent
            if (event.eventType === 'order.transaction_created') {
                const txData = event.data as TransactionCreatedEventData
                const tx = {
                    type: txData.transactionType as any,
                    hash: txData.transactionHash,
                    network: txData.networkId,
                }
                accumulatedTxsRef.current = [...accumulatedTxsRef.current, tx]

                const currentOrder = store?.getState().activeSwap?.htlcFromApi
                if (currentOrder) {
                    store?.getState().setHtlcFromApi({
                        ...currentOrder,
                        transactions: [...(currentOrder.transactions ?? []), tx],
                    })
                }
            }
        },
        done: (_data: unknown) => {
            return 'close' as const
        },
    }), [store])

    useEventSource(url, {
        enabled: enabled && !!url,
        onEvent: eventHandlers,
    })
}
