import { useState, useEffect, useCallback } from 'react'
import type { HTLCFromApi } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import type { SwapHistoryParams } from '../types'

export interface UseSwapHistoryResult {
    swaps: HTLCFromApi[]
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export function useSwapHistory(params: SwapHistoryParams): UseSwapHistoryResult {
    const { apiClient } = useTrainContext()
    const { addresses, page = 1 } = params

    const [swaps, setSwaps] = useState<HTLCFromApi[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const fetchSwaps = useCallback(async () => {
        if (!addresses.length) return
        setIsLoading(true)
        try {
            const data = await apiClient.getSwaps(addresses, page)
            setSwaps(data)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setIsLoading(false)
        }
    }, [apiClient, addresses, page])

    useEffect(() => {
        fetchSwaps()
    }, [fetchSwaps])

    return { swaps, isLoading, error, refetch: fetchSwaps }
}
