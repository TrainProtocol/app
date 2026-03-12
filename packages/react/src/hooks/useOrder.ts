import { useState, useEffect, useCallback } from 'react'
import type { HTLCFromApiResponse } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import type { OrderParams } from '../types'

export interface UseOrderResult {
    order: HTLCFromApiResponse | null
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export function useOrder(params: OrderParams): UseOrderResult {
    const { apiClient } = useTrainContext()
    const { solverId, hashlock } = params

    const [order, setOrder] = useState<HTLCFromApiResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const fetchOrder = useCallback(async () => {
        if (!solverId || !hashlock) return
        setIsLoading(true)
        try {
            const data = await apiClient.getOrder(solverId, hashlock)
            setOrder(data)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setIsLoading(false)
        }
    }, [apiClient, solverId, hashlock])

    useEffect(() => {
        fetchOrder()
    }, [fetchOrder])

    return { order, isLoading, error, refetch: fetchOrder }
}
