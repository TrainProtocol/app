import { useMemo, useState, useEffect } from 'react'
import { parseUnits } from 'viem'
import { SwapFormValues } from '../components/DTOs/SwapFormValues'
import type { SwapQuote } from '@train-protocol/react'
import { Token } from '../Models/Network'
import { useQuote } from '@train-protocol/react'

type UseQuoteData = {
    quote?: SwapQuote
    solverId?: string
    quoteError?: QuoteError
    isQuoteLoading: boolean
    isDebouncing: boolean
    mutateFee: () => void
}

export type QuoteError = {
    code: string;
    message: string;
    response?: {
        data?: {
            error?: {
                code?: string;
                message?: string;
                metadata?: {
                    AmountLimit: number
                }
            }
        };
    }
    metadata?: {
        StatusCode?: string;
        [key: string]: any;
    }
}

type Props = {
    from: string | undefined
    to: string | undefined
    fromCurrency: Token | undefined
    toCurrency: Token | undefined
    amount?: string | number
    receiveAmount?: string | number
}

export function useQuoteData(formValues: Props | undefined, refreshInterval?: number): UseQuoteData {
    const { fromCurrency, toCurrency, from, to, amount, receiveAmount } = formValues || {}

    const isReverse = receiveAmount != null && receiveAmount !== ''
    const decimals = isReverse ? toCurrency?.decimals : fromCurrency?.decimals
    const rawAmount = isReverse ? receiveAmount : amount
    const convertedAmount = useMemo(() => {
        if (rawAmount == null || rawAmount === '' || !decimals) return undefined
        try {
            return parseUnits(String(rawAmount), decimals).toString()
        } catch {
            return undefined
        }
    }, [rawAmount, decimals])

    const [debouncedAmount, setDebouncedAmount] = useState(convertedAmount)
    const [isDebouncing, setIsDebouncing] = useState(false)

    useEffect(() => {
        if (convertedAmount === debouncedAmount) {
            setIsDebouncing(false)
            return
        }

        setIsDebouncing(true)
        const handler = setTimeout(() => {
            setDebouncedAmount(convertedAmount)
            setIsDebouncing(false)
        }, 300)

        return () => {
            clearTimeout(handler)
        }
    }, [convertedAmount, debouncedAmount])

    const hasQuoteParams = !!(from && to && fromCurrency && toCurrency)
    const hasValidAmount = !!debouncedAmount && Number(debouncedAmount) > 0
    const canGetQuote = !!(hasQuoteParams && hasValidAmount && !isDebouncing)

    const { bestQuote, bestSolver, isLoading, error, refetch } = useQuote({
        amount: !isReverse ? (debouncedAmount ?? '') : undefined,
        receiveAmount: isReverse ? (debouncedAmount ?? '') : undefined,
        sourceNetwork: from ?? '',
        destinationNetwork: to ?? '',
        sourceTokenContract: fromCurrency?.contract || undefined,
        destinationTokenContract: toCurrency?.contract || undefined,
        enabled: canGetQuote,
        refreshInterval: (refreshInterval !== undefined && refreshInterval !== null) ? refreshInterval : 42000,
        debounceMs: 0,
    })

    return {
        quote: (error || !hasQuoteParams || !hasValidAmount) ? undefined : bestQuote as SwapQuote | undefined,
        solverId: (error || !hasQuoteParams || !hasValidAmount) ? undefined : bestSolver?.solver?.id,
        isQuoteLoading: isLoading || isDebouncing,
        isDebouncing,
        quoteError: error as unknown as QuoteError | undefined,
        mutateFee: refetch,
    }
}

export function transformFormValuesToQuoteArgs(values: SwapFormValues): Props | undefined {
    const direction = values.quoteDirection ?? 'source'
    return {
        amount: direction === 'source' ? values.amount : undefined,
        receiveAmount: direction === 'destination' ? values.receiveAmount : undefined,
        from: values.from?.caip2Id,
        to: values.to?.caip2Id,
        fromCurrency: values.fromCurrency,
        toCurrency: values.toCurrency,
    }
}

/** Build quote params from atomic swap state (for Swap step). */
export function buildQuoteParamsFromAtomic(params: {
    from?: string
    to?: string
    fromCurrency?: Token
    toCurrency?: Token
    amount?: string | number
}): Props | undefined {
    if (!params.from || !params.to || !params.fromCurrency || !params.toCurrency || params.amount == null || params.amount === '') return undefined
    return {
        from: params.from,
        to: params.to,
        fromCurrency: params.fromCurrency,
        toCurrency: params.toCurrency,
        amount: String(params.amount),
    }
}
