import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { HTLCFromApi } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { trainQueryKeys } from '../internal/queryKeys'
import { normalizeQueryError } from '../internal/normalizeQueryError'
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

    const query = useQuery({
        queryKey: trainQueryKeys.swapHistory(addresses, page),
        queryFn: () => apiClient.getSwaps(addresses, page),
        enabled: addresses.length > 0,
    })

    const refetch = useCallback(async () => {
        await query.refetch()
    }, [query])

    return {
        swaps: query.data ?? [],
        isLoading: query.isLoading,
        error: normalizeQueryError(query.error),
        refetch,
    }
}
