import { createContext, useState, useContext, useEffect } from 'react'
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import LayerSwapApiClient, { Quote, SwapQuote } from '../lib/layerSwapApiClient';
import useSWR from 'swr';
import { ApiResponse } from '../Models/ApiResponse';

const FeeStateContext = createContext<ContextType | null>(null);

type ContextType = {
    minAllowedAmount: number | undefined,
    maxAllowedAmount: number | undefined,
    fee: Quote | undefined,
    mutateFee: () => void,
    mutateLimits: () => void,
    valuesChanger: (values: SwapFormValues) => void,
    isFeeLoading: boolean,
    updatePolling: (value: boolean) => void
}

export function FeeProvider({ children }) {

    const commitId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('commitId') : null
    const [values, setValues] = useState<SwapFormValues>()
    const [cachedRateData, setCachedRateData] = useState<Quote>()
    const { fromCurrency, toCurrency, from, to, amount, refuel } = values || {}
    const [debouncedAmount, setDebouncedAmount] = useState(amount);
    const [poll, updatePolling] = useState(true)

    const valuesChanger = (values: SwapFormValues) => {
        setValues(values)
    }

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedAmount(amount);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [amount, 1000]);

    const apiClient = new LayerSwapApiClient()

    const { data: amountRange, mutate: mutateLimits } = useSWR<ApiResponse<{
        minAmount: number
        minAmountInUsd: number
        maxAmount: number
        maxAmountInUsd: number
    }>>((from && fromCurrency && to && toCurrency && !commitId) ?
        `/limits?SourceNetwork=${from?.name}&SourceToken=${fromCurrency?.symbol}&DestinationNetwork=${to?.name}&DestinationToken=${toCurrency?.symbol}` : null, apiClient.fetcher, {
        refreshInterval: poll ? 20000 : 0,
    })

    const isAmountInRange = (amountRange?.data && debouncedAmount) && (Number(debouncedAmount) >= amountRange?.data?.minAmount && Number(debouncedAmount) <= amountRange?.data?.maxAmount)

    const { data: lsFee, mutate: mutateFee, isLoading: isFeeLoading } = useSWR<ApiResponse<SwapQuote>>((from && fromCurrency && to && toCurrency && debouncedAmount && isAmountInRange && !commitId) ?
        `/quote?SourceNetwork=${from?.name}&SourceToken=${fromCurrency?.symbol}&DestinationNetwork=${to?.name}&DestinationToken=${toCurrency?.symbol}&Amount=${debouncedAmount}` : null, apiClient.fetcher, {
        refreshInterval: poll ? 42000 : 0,
    })
    useEffect(() => {
        if (lsFee?.data)
            setCachedRateData({
                quote: lsFee?.data
            })
    }, [lsFee])

    return (
        <FeeStateContext.Provider value={{
            minAllowedAmount: amountRange?.data?.minAmount,
            maxAllowedAmount: amountRange?.data?.maxAmount,
            fee: {
                quote: lsFee?.data
            },
            mutateFee,
            mutateLimits,
            valuesChanger,
            isFeeLoading,
            updatePolling
        }}>
            {children}
        </FeeStateContext.Provider>
    )
}

export function useFee() {
    const data = useContext(FeeStateContext);

    if (data === null) {
        throw new Error('useFee must be used within a FeeProvider');
    }

    return data;
}
