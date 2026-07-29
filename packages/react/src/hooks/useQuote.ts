import { useState, useEffect, useCallback } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { SolverQuote, QuoteDetails, AggregatedQuoteResponse } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { trainQueryKeys } from '../internal/queryKeys'
import { normalizeQueryError } from '../internal/normalizeQueryError'
import type { QuoteParams } from '../types'

export type SolverQuoteError = AggregatedQuoteResponse['errors'][number]

export interface UseQuoteResult {
    quotes: SolverQuote[]
    bestQuote: QuoteDetails | undefined
    bestSolver: SolverQuote | undefined
    quoteErrors: SolverQuoteError[]
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<QuoteDetails | undefined>
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        if (delayMs <= 0) return
        const timer = setTimeout(() => setDebounced(value), delayMs)
        return () => clearTimeout(timer)
    }, [value, delayMs])

    return delayMs <= 0 ? value : debounced
}

export function useQuote(params: QuoteParams): UseQuoteResult {
    const { apiClient } = useTrainContext()
    const {
        amount,
        receiveAmount,
        sourceNetwork,
        destinationNetwork,
        sourceTokenContract,
        destinationTokenContract,
        enabled = true,
        refreshInterval = 42000,
        debounceMs = 300,
    } = params

    const activeAmount = amount ?? receiveAmount
    const debouncedAmount = useDebouncedValue(activeAmount, debounceMs)
    const isDebouncing = debounceMs > 0 && debouncedAmount !== activeAmount

    const canFetch = enabled && !!debouncedAmount && !!sourceNetwork && !!destinationNetwork && Number(debouncedAmount) > 0

    const amountParams = amount != null
        ? { amount: debouncedAmount }
        : receiveAmount != null
            ? { receiveAmount: debouncedAmount }
            : {}

    const queryKeyParams = {
        ...amountParams,
        sourceNetwork,
        destinationNetwork,
        sourceTokenContract,
        destinationTokenContract,
    }

    const query = useQuery({
        queryKey: trainQueryKeys.quote(queryKeyParams),
        queryFn: async () => {
            const result = await apiClient.getQuote({
                ...amountParams,
                sourceNetwork,
                destinationNetwork,
                sourceTokenContract,
                destinationTokenContract,
                includeReward: true,
            })
            return {
                quotes: result.quotes ?? [],
                errors: result.errors ?? [],
            }
        },
        enabled: canFetch,
        refetchInterval: refreshInterval || false,
        staleTime: 10_000,
        placeholderData: keepPreviousData,
    })

    const quotes = query.data?.quotes ?? []
    const quoteErrors = query.data?.errors ?? []
    const bestSolver = quotes.find(q => q.isBest)
    const bestQuote = bestSolver?.quote
    const queryRefetch = query.refetch

    const refetch = useCallback(async () => {
        const result = await queryRefetch()
        if (result.error) {
            throw normalizeQueryError(result.error) ?? new Error('Failed to refresh quote')
        }

        const refreshedQuotes = result.data?.quotes ?? []
        return refreshedQuotes.find(q => q.isBest)?.quote
    }, [queryRefetch])

    return {
        quotes,
        bestQuote,
        bestSolver,
        quoteErrors,
        isLoading: isDebouncing || (canFetch && (query.isLoading || query.isPlaceholderData)),
        error: normalizeQueryError(query.error),
        refetch,
    }
}
