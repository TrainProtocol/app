import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SolverQuote, QuoteDetails } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { trainQueryKeys } from '../internal/queryKeys'
import { normalizeQueryError } from '../internal/normalizeQueryError'
import type { QuoteParams } from '../types'

export interface UseQuoteResult {
    quotes: SolverQuote[]
    bestQuote: QuoteDetails | undefined
    bestSolver: SolverQuote | undefined
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        if (delayMs <= 0) {
            setDebounced(value)
            return
        }
        const timer = setTimeout(() => setDebounced(value), delayMs)
        return () => clearTimeout(timer)
    }, [value, delayMs])

    return debounced
}

export function useQuote(params: QuoteParams): UseQuoteResult {
    const { apiClient } = useTrainContext()
    const {
        amount,
        sourceNetwork,
        destinationNetwork,
        sourceTokenContract,
        destinationTokenContract,
        enabled = true,
        refreshInterval = 42000,
        debounceMs = 300,
    } = params

    const debouncedAmount = useDebouncedValue(amount, debounceMs)
    const isDebouncing = debounceMs > 0 && debouncedAmount !== amount

    const canFetch = enabled && !!debouncedAmount && !!sourceNetwork && !!destinationNetwork && Number(debouncedAmount) > 0

    const queryKeyParams = {
        amount: debouncedAmount,
        sourceNetwork,
        destinationNetwork,
        sourceTokenContract,
        destinationTokenContract,
    }

    const query = useQuery({
        queryKey: trainQueryKeys.quote(queryKeyParams),
        queryFn: async () => {
            const result = await apiClient.getQuote({
                amount: debouncedAmount,
                sourceNetwork,
                destinationNetwork,
                sourceTokenContract,
                destinationTokenContract,
                includeReward: true,
            })
            return result.quotes ?? []
        },
        enabled: canFetch,
        refetchInterval: refreshInterval || false,
        staleTime: 10_000,
    })

    const quotes = canFetch ? (query.data ?? []) : []
    const bestSolver = quotes.find(q => q.isBest)
    const bestQuote = bestSolver?.quote

    const refetch = useCallback(async () => {
        await query.refetch()
    }, [query])

    return {
        quotes,
        bestQuote,
        bestSolver,
        isLoading: isDebouncing || (canFetch && query.isLoading),
        error: normalizeQueryError(query.error),
        refetch,
    }
}
