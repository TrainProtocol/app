import { useEffect, useRef, useState } from 'react'
import { HTLCFromApi, HTLCTransaction, OrderStreamEvent, TransactionCreatedEventData } from '@train-protocol/sdk'
import AppSettings from '@/lib/AppSettings'

type UseOrderStreamParams = {
    solverId: string | undefined
    hashlock: string | undefined
    enabled: boolean
    onOrder: (order: HTLCFromApi) => void
    onFailed?: () => void
}

export default function useOrderStreaming({ solverId, hashlock, enabled, onOrder, onFailed }: UseOrderStreamParams) {
    const [order, setOrder] = useState<HTLCFromApi | undefined>()
    const [error, setError] = useState<boolean>(false)
    const onOrderRef = useRef(onOrder)
    const onFailedRef = useRef(onFailed)
    const accumulatedTransactionsRef = useRef<HTLCFromApi['transactions']>([])

    useEffect(() => {
        onOrderRef.current = onOrder
        onFailedRef.current = onFailed
    }, [onOrder, onFailed])

    useEffect(() => {
        if (!enabled || !solverId || !hashlock) return

        accumulatedTransactionsRef.current = []

        const url = `${AppSettings.TrainApiUri}/api/v1/orders/${solverId}/${hashlock}/stream`
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
            const raw = JSON.parse(e.data)
            const data: HTLCFromApi = raw.order ?? raw
            if (data.transactions?.length) {
                accumulatedTransactionsRef.current = data.transactions
            }
            setOrder(data)
            onOrderRef.current(data)
        }

        const handleDone = (e: MessageEvent) => {
            const { finalStatus } = JSON.parse(e.data) as { finalStatus: string }
            if (finalStatus === 'Failed') {
                onFailedRef.current?.()
            }
        }

        es.addEventListener('order', handleOrder)
        es.addEventListener('order_event', handleOrderEvent)
        es.addEventListener('done', handleDone)
        es.onerror = () => setError(true)

        return () => es.close()
    }, [enabled, solverId, hashlock])

    return { order, error }
}
