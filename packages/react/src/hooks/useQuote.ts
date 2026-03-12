import { useState, useEffect, useRef, useCallback } from 'react'
import type { SolverQuote, QuoteDetails } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import type { QuoteParams } from '../types'

export interface UseQuoteResult {
    quotes: SolverQuote[]
    bestQuote: QuoteDetails | undefined
    bestSolver: SolverQuote | undefined
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
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
    } = params

    const [quotes, setQuotes] = useState<SolverQuote[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const canFetch = enabled && !!amount && !!sourceNetwork && !!destinationNetwork && Number(amount) > 0

    const fetchQuote = useCallback(async () => {
        if (!canFetch) return
        setIsLoading(true)
        try {
            const result = await apiClient.getQuote({
                amount,
                sourceNetwork,
                destinationNetwork,
                sourceTokenContract,
                destinationTokenContract,
                includeReward: true,
            })
            setQuotes(result.quotes ?? [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setIsLoading(false)
        }
    }, [canFetch, apiClient, amount, sourceNetwork, destinationNetwork, sourceTokenContract, destinationTokenContract])

    // Debounced fetch on param changes
    useEffect(() => {
        if (!canFetch) {
            setQuotes([])
            setError(null)
            return
        }

        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(fetchQuote, 300)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [fetchQuote, canFetch])

    // Auto-refresh interval
    useEffect(() => {
        if (!canFetch || !refreshInterval) return

        intervalRef.current = setInterval(fetchQuote, refreshInterval)
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [fetchQuote, canFetch, refreshInterval])

    const bestSolver = quotes.find(q => q.isBest)
    const bestQuote = bestSolver?.quote

    return {
        quotes,
        bestQuote,
        bestSolver,
        isLoading,
        error,
        refetch: fetchQuote,
    }
}
