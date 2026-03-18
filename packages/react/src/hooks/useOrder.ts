import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { HTLCFromApiResponse } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { trainQueryKeys } from '../internal/queryKeys'
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

    const query = useQuery({
        queryKey: trainQueryKeys.order(solverId, hashlock),
        queryFn: () => apiClient.getOrder(solverId, hashlock),
        enabled: !!solverId && !!hashlock,
    })

    const refetch = useCallback(async () => {
        await query.refetch()
    }, [query])

    return {
        order: query.data ?? null,
        isLoading: query.isLoading,
        error: query.error instanceof Error ? query.error : query.error ? new Error(String(query.error)) : null,
        refetch,
    }
}
