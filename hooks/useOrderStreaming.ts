import { useEffect, useRef, useState } from 'react'
import TrainApiClient, { HTLCFromApi } from '@/lib/trainApiClient'

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

    useEffect(() => {
        onOrderRef.current = onOrder
    })

    useEffect(() => {
        if (!enabled || !solverId || !hashlock) return

        const url = `${TrainApiClient.apiBaseEndpoint}/api/v1/orders/${solverId}/${hashlock}/stream`
        const es = new EventSource(url)

        const handleOrder = (e: MessageEvent) => {
            const data = JSON.parse(e.data) as HTLCFromApi
            setOrder(data)
            onOrderRef.current(data)
        }

        es.addEventListener('order', handleOrder)
        es.addEventListener('order_event', handleOrder)
        es.addEventListener('done', () => es.close())
        es.onerror = () => setError(true)

        return () => es.close()
    }, [enabled, solverId, hashlock])

    return { order, error }
}
