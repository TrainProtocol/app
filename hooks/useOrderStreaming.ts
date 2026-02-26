import { useEffect, useRef, useState } from 'react'
import TrainApiClient, { HTLCFromApi, HTLCTransaction, OrderStreamEvent, TransactionCreatedEventData } from '@/lib/trainApiClient'

type UseOrderStreamParams = {
    solverId: string | undefined
    hashlock: string | undefined
    enabled: boolean
    onOrder: (order: HTLCFromApi) => void
}

export default function useOrderStreaming({ solverId, hashlock, enabled, onOrder }: UseOrderStreamParams) {
    const [order, setOrder] = useState<HTLCFromApi | undefined>()
    const [error, setError] = useState<boolean>(false)
    const onOrderRef = useRef(onOrder)
    const accumulatedTransactionsRef = useRef<HTLCFromApi['transactions']>([])

    useEffect(() => {
        onOrderRef.current = onOrder
    })

    useEffect(() => {
        if (!enabled || !solverId || !hashlock) return

        accumulatedTransactionsRef.current = []

        const url = `${TrainApiClient.apiBaseEndpoint}/api/v1/orders/${solverId}/${hashlock}/stream`
        const es = new EventSource(url)

        const handleOrderEvent = (e: MessageEvent) => {
            const event = JSON.parse(e.data) as OrderStreamEvent
            if (event.eventType === 'order.transaction_created') {
                const { networkId, transactionType, transactionHash } = event.data as TransactionCreatedEventData
                accumulatedTransactionsRef.current = [
                    ...accumulatedTransactionsRef.current,
                    { type: transactionType as HTLCTransaction, hash: transactionHash, networkId },
                ]
                const updated = { transactions: accumulatedTransactionsRef.current } as HTLCFromApi
                setOrder(updated)
                onOrderRef.current(updated)
            }
        }

        const handleOrder = (e: MessageEvent) => {
            const data = JSON.parse(e.data) as HTLCFromApi
            setOrder(data)
            onOrderRef.current(data)
        }

        es.addEventListener('order', handleOrder)
        es.addEventListener('order_event', handleOrderEvent)
        es.addEventListener('done', () => es.close())
        es.onerror = () => setError(true)

        return () => es.close()
    }, [enabled, solverId, hashlock])

    return { order, error }
}
