import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { parseUnits } from 'viem'
import { SwapFormValues } from '../components/DTOs/SwapFormValues'
import LayerSwapApiClient, { SwapQuote } from '../lib/trainApiClient'
import { ApiResponse } from '../Models/ApiResponse'
import { Token } from '../Models/Network'
import { create } from 'zustand'

type UseQuoteData = {
    quote?: SwapQuote
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

    const params = new URLSearchParams({
        Amount: amount,
        SourceNetwork: sourceNetwork,
        DestinationNetwork: destinationNetwork,
    })

    if (sourceTokenContract) {
        params.append('SourceTokenContract', sourceTokenContract)
    }
    if (destinationTokenContract) {
        params.append('DestinationTokenContract', destinationTokenContract)
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

    const apiClient = new LayerSwapApiClient()

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

    const quoteFetchWrapper = useCallback(async (url: string): Promise<ApiResponse<SwapQuote>> => {
        const { setLoading, key, setKey } = useLoadingStore.getState()
        try {
            if (key !== url) {
                setLoading(true)
            }

            const newData = await apiClient.fetcher(url) as ApiResponse<SwapQuote>

            setKey(url)
            setLoading(false)
            return newData
        }
        catch (error) {
            setLoading(false)
            setKey(null)
            throw error
        }
    }, [])

    const { data: quote, mutate: mutateFee, error: quoteError } = useSWR<ApiResponse<SwapQuote>>(quoteURL, quoteFetchWrapper, {
        refreshInterval: (refreshInterval !== undefined && refreshInterval !== null) ? refreshInterval : 42000,
        dedupingInterval: 5000,
        keepPreviousData: true,
    })

    return {
        quote: (quoteError || !canGetQuote) ? undefined : quote?.data,
        isQuoteLoading: isQuoteLoading,
        isDebouncing,
        quoteError: quoteError as QuoteError | undefined,
        mutateFee,
    }
}

export function transformFormValuesToQuoteArgs(values: SwapFormValues): Props | undefined {
    return {
        amount: values.amount,
        from: values.from?.slug,
        to: values.to?.slug,
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
