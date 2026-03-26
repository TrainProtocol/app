import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { parseUnits } from 'viem'
import { SwapFormValues } from '../components/DTOs/SwapFormValues'
import TrainApiClient, { SwapQuote, AggregatedQuoteResponse } from '../lib/trainApiClient'
import { Token } from '../Models/Network'
import { create } from 'zustand'

const apiClient = new TrainApiClient()

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

type QuoteResult = {
    quote: SwapQuote
    solverId: string
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

    const canGetQuote = from && to && fromCurrency && toCurrency && debouncedAmount

    const quoteURL = (canGetQuote && !isDebouncing)
        ? buildQuoteUrl({
            sourceNetwork: from,
            destinationNetwork: to,
            amount: String(debouncedAmount),
            sourceTokenContract: fromCurrency?.contractAddress ? fromCurrency.contractAddress : undefined,
            destinationTokenContract: toCurrency?.contractAddress ? toCurrency.contractAddress : undefined,
        })
        : null

    const isQuoteLoading = useLoadingStore((state) => state.isLoading)
    const { mutate: globalMutate } = useSWRConfig()

    const quoteFetchWrapper = useCallback(async (url: string): Promise<QuoteResult | null> => {
        const { setLoading, key, setKey } = useLoadingStore.getState()
        try {
            if (key !== url) {
                setLoading(true)
            }

            const response = await apiClient.fetcher(url) as { data?: AggregatedQuoteResponse; error?: { message: string } }

            setKey(url)
            setLoading(false)

            if (response.error) {
                throw new Error(response.error.message)
            }

            const best = response.data?.quotes?.find(q => q.isBest)

            if (!best?.quote) {
                throw new Error('No quote available')
            }

            return { quote: best.quote, solverId: best.solver.id }
        }
        catch (error) {
            setLoading(false)
            setKey(null)
            throw error
        }
    }, [])

    const { data, mutate: mutateFee, error: quoteError } = useSWR<QuoteResult | null>(
        quoteURL,
        quoteFetchWrapper,
        {
            refreshInterval: (refreshInterval !== undefined && refreshInterval !== null) ? refreshInterval : 42000,
            dedupingInterval: 5000,
            keepPreviousData: true,
            onError: (_err, key) => {
                globalMutate(key, null, { revalidate: false })
            },
        }
    )

    const resolvedQuote = (quoteError || !canGetQuote) ? undefined : data?.quote
    const resolvedSolverId = (quoteError || !canGetQuote) ? undefined : data?.solverId
    return {
        quote: resolvedQuote,
        solverId: resolvedSolverId,
        isQuoteLoading,
        isDebouncing,
        quoteError: quoteError as QuoteError | undefined,
        mutateFee,
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

type LoadingState = {
    key: string | null;
    setKey: (value: string | null) => void;
    isLoading: boolean;
    setLoading: (loading: boolean) => void;
};

export const useLoadingStore = create<LoadingState>((set) => ({
    key: null,
    setKey: (value) => set({ key: value }),
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),
}));
