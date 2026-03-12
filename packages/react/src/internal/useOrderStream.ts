import { useState, useRef, useMemo } from 'react'
import type { HTLCFromApi, OrderStreamEvent, TransactionCreatedEventData } from '@train-protocol/sdk'
import { useEventSource } from './useEventSource'

export interface UseOrderStreamOptions {
    baseUrl: string
    solverId: string | undefined
    hashlock: string | undefined
    enabled: boolean
    onOrder?: (order: HTLCFromApi) => void
}

/**
 * SSE stream for order events from Station API.
 * Accumulates transactions from order_event messages.
 */
export function useOrderStream(options: UseOrderStreamOptions) {
    const { baseUrl, solverId, hashlock, enabled, onOrder } = options
    const [order, setOrder] = useState<HTLCFromApi | null>(null)
    const accumulatedTxsRef = useRef<HTLCFromApi['transactions']>([])

    const url = solverId && hashlock
        ? `${baseUrl}/api/v1/orders/${solverId}/${hashlock}/stream`
        : null

    const eventHandlers = useMemo(() => ({
        order: (data: unknown) => {
            const orderData = data as HTLCFromApi
            const merged = {
                ...orderData,
                transactions: [
                    ...(orderData.transactions ?? []),
                    ...accumulatedTxsRef.current,
                ],
            }
            setOrder(merged)
            onOrder?.(merged)
        },
        order_event: (data: unknown) => {
            const event = data as OrderStreamEvent
            if (event.eventType === 'order.transaction_created') {
                const txData = event.data as TransactionCreatedEventData
                const tx = {
                    type: txData.transactionType as any,
                    hash: txData.transactionHash,
                    networkId: txData.networkId,
                }
                accumulatedTxsRef.current = [...accumulatedTxsRef.current, tx]

                setOrder(prev => {
                    if (!prev) return prev
                    const updated = {
                        ...prev,
                        transactions: [...(prev.transactions ?? []), tx],
                    }
                    onOrder?.(updated)
                    return updated
                })
            }
        },
    }), [onOrder])

    useEventSource(url, {
        enabled: enabled && !!url,
        onEvent: eventHandlers,
    })

    return { order }
}
