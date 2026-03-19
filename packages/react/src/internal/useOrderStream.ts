import { useState, useRef, useMemo, useEffect } from 'react'
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
    const [order, setOrder] = useState<HTLCFromApi | null>(null)
    const accumulatedTxsRef = useRef<HTLCFromApi['transactions']>([])

    // Reset accumulated state when stream params change (new swap)
    useEffect(() => {
        accumulatedTxsRef.current = []
        setOrder(null)
    }, [solverId, hashlock])

    const url = solverId && hashlock
        ? `${baseUrl}/api/v1/orders/${solverId}/${hashlock}/stream`
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
            setOrder(merged)
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

                setOrder(prev => {
                    if (!prev) return prev
                    const updated = {
                        ...prev,
                        transactions: [...(prev.transactions ?? []), tx],
                    }
                    store?.getState().setHtlcFromApi(updated)
                    return updated
                })
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

    return { order }
}
