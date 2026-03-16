import { useMemo, useState, useEffect } from 'react'
import { parseUnits } from 'viem'
import { SwapFormValues } from '../components/DTOs/SwapFormValues'
import { SwapQuote } from '../lib/trainApiClient'
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
    amount: string | number | undefined
}

export type QuoteUrlArgs = {
    sourceNetwork: string
    destinationNetwork: string
    amount: string
    sourceTokenContract?: string
    destinationTokenContract?: string
}

export function buildQuoteUrl(args: QuoteUrlArgs): string {
    const {
        sourceNetwork,
        destinationNetwork,
        amount,
        sourceTokenContract,
        destinationTokenContract,
    } = args

    const includeReward = 'true'

    const params = new URLSearchParams({
        amount,
        sourceNetwork,
        destinationNetwork,
        includeReward,
    })

    if (sourceTokenContract) {
        params.append('sourceTokenContract', sourceTokenContract)
    }
    if (destinationTokenContract) {
        params.append('destinationTokenContract', destinationTokenContract)
    }

    return `/quote?${params.toString()}`
}

export function useQuoteData(formValues: Props | undefined, refreshInterval?: number): UseQuoteData {
    const { fromCurrency, toCurrency, from, to, amount } = formValues || {}

    const convertedAmount = useMemo(() => {
        if (amount == null || amount === '' || !fromCurrency?.decimals) return undefined
        try {
            return parseUnits(String(amount), fromCurrency.decimals).toString()
        } catch {
            return undefined
        }
    }, [amount, fromCurrency?.decimals])

    const [debouncedAmount, setDebouncedAmount] = useState(convertedAmount)
    const [isDebouncing, setIsDebouncing] = useState(false)

    useEffect(() => {
        if (convertedAmount === debouncedAmount) return

        setIsDebouncing(true)
        const handler = setTimeout(() => {
            setDebouncedAmount(convertedAmount)
            setIsDebouncing(false)
        }, 300)

        return () => {
            clearTimeout(handler)
        }
    }, [convertedAmount, debouncedAmount])

    const canGetQuote = !!(from && to && fromCurrency && toCurrency && debouncedAmount && !isDebouncing)

    // Use React package's useQuote hook
    const { bestQuote, bestSolver, isLoading, error, refetch } = useQuote({
        amount: debouncedAmount ?? '',
        sourceNetwork: from ?? '',
        destinationNetwork: to ?? '',
        sourceTokenContract: fromCurrency?.contractAddress || undefined,
        destinationTokenContract: toCurrency?.contractAddress || undefined,
        enabled: canGetQuote,
        refreshInterval: (refreshInterval !== undefined && refreshInterval !== null) ? refreshInterval : 42000,
    })

    return {
        quote: (error || !canGetQuote) ? undefined : bestQuote as SwapQuote | undefined,
        solverId: (error || !canGetQuote) ? undefined : bestSolver?.solver?.id,
        isQuoteLoading: isLoading,
        isDebouncing,
        quoteError: error as unknown as QuoteError | undefined,
        mutateFee: refetch,
    }
}

export function transformFormValuesToQuoteArgs(values: SwapFormValues): Props | undefined {
    return {
        amount: values.amount,
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
