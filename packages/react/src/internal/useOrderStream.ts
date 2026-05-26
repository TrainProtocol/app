import { useRef, useMemo, useEffect } from 'react'
import type { HTLCFromApi, HTLCFromApiResponse, OrderStreamEvent, OrderCreatedEventData, TransactionCreatedEventData, StatusChangedEventData } from '@train-protocol/sdk'
import type { SwapStore } from './store'
import { useEventSource } from './useEventSource'

export interface UseOrderStreamOptions {
    baseUrl: string
    solverAddress: string | undefined
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
    const { baseUrl, solverAddress, hashlock, enabled, store, onFailed } = options
    const onFailedRef = useRef(onFailed)
    onFailedRef.current = onFailed
    const accumulatedTxsRef = useRef<HTLCFromApi['transactions']>([])

    // Reset accumulated state when stream params change (new swap)
    useEffect(() => {
        accumulatedTxsRef.current = []
    }, [solverAddress, hashlock])

    const url = hashlock
        ? `${baseUrl}/api/v1/orders/${encodeURIComponent(hashlock)}/stream${solverAddress ? `?solverAddress=${encodeURIComponent(solverAddress)}` : ''}`
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
            const getCurrent = (): HTLCFromApi =>
                store?.getState().orderData[hashlock]
                ?? ({ hashlock, transactions: [] } as unknown as HTLCFromApi)

            if (event.eventType === 'order.created') {
                const created = event.data as OrderCreatedEventData
                const base = getCurrent()
                store?.getState().setOrderData(hashlock, {
                    ...base,
                    hashlock: created.hashlock,
                    sourceAddress: created.sourceAddress,
                    destinationAddress: created.destinationAddress,
                    sourceAmount: created.sourceAmount,
                    destinationAmount: created.destinationAmount,
                    transactions: [
                        ...(base.transactions ?? []),
                        ...accumulatedTxsRef.current.filter(
                            (t) => !(base.transactions ?? []).some(
                                (b) => b.hash === t.hash && b.network === t.network,
                            ),
                        ),
                    ],
                } as HTLCFromApi)
            } else if (event.eventType === 'order.transaction_created') {
                const txData = event.data as TransactionCreatedEventData
                const tx = {
                    type: txData.transactionType as any,
                    hash: txData.transactionHash,
                    network: txData.network,
                }
                accumulatedTxsRef.current = [...accumulatedTxsRef.current, tx]
                const base = getCurrent()
                store?.getState().setOrderData(hashlock, {
                    ...base,
                    transactions: [...(base.transactions ?? []), tx],
                } as HTLCFromApi)
            } else if (event.eventType === 'order.status_changed') {
                const statusData = event.data as StatusChangedEventData
                if (statusData.status === 'failed') {
                    onFailedRef.current?.(statusData.failureReason ?? 'Please wait for the timelock to expire, then refund to receive your assets back.')
                }
                const base = getCurrent()
                store?.getState().setOrderData(hashlock, {
                    ...base,
                    status: statusData.status,
                    failureReason: statusData.failureReason,
                } as HTLCFromApi)
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
