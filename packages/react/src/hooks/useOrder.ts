import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { HTLCFromApiResponse } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { trainQueryKeys } from '../internal/queryKeys'
import { normalizeQueryError } from '../internal/normalizeQueryError'
import type { OrderParams } from '../types'

export interface UseOrderResult {
    order: HTLCFromApiResponse | null
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export function useOrder(params: OrderParams): UseOrderResult {
    const { apiClient } = useTrainContext()
    const { hashlock, solverAddress } = params

    const query = useQuery({
        queryKey: trainQueryKeys.order(hashlock, solverAddress),
        queryFn: () => apiClient.getOrder(hashlock, solverAddress),
        enabled: !!hashlock,
    })

    const refetch = useCallback(async () => {
        await query.refetch()
    }, [query])

    return {
        order: query.data ?? null,
        isLoading: query.isLoading,
        error: normalizeQueryError(query.error),
        refetch,
    }
}
