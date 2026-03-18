import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
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

    const quoteFetchWrapper = useCallback(async (url: string): Promise<QuoteResult | null> => {
        const { setLoading, key, setKey } = useLoadingStore.getState()
        try {
            if (key !== url) {
                setLoading(true)
            }

            // Mock quote for chains not yet supported by the real API
            const urlParams = new URLSearchParams(url.split('?')[1])
            const sourceNetwork = urlParams.get('sourceNetwork') ?? ''
            if (sourceNetwork.startsWith('starknet:')) {
                setKey(url)
                setLoading(false)
                const amount = urlParams.get('amount') ?? '1000000000000000000'
                return {
                    quote: {
                        signature: 'mock-starknet-quote',
                        totalFee: '500000000000000',
                        receiveAmount: String(BigInt(amount) * 95n / 100n),
                        sourceSolverAddress: '0x056d5aab86196192bbdb571116b69de5169453eaf3f164300de2616c184fd697',
                        destinationSolverAddress: '0x0000000000000000000000000000000000000001',
                        quoteExpirationTimestampInSeconds: Math.floor(Date.now() / 1000) + 3600,
                        route: {
                            source: { networkSlug: sourceNetwork, tokenSymbol: 'ETH', tokenContract: urlParams.get('sourceTokenContract') ?? '', tokenDecimals: 18 },
                            destination: { networkSlug: urlParams.get('destinationNetwork')!, tokenSymbol: 'ETH', tokenContract: urlParams.get('destinationTokenContract') ?? '', tokenDecimals: 18 },
                            minAmountInSource: '1000000000000000',
                            maxAmountInSource: '10000000000000000000',
                        },
                        timelock: { timelockTimeSpanInSeconds: 3600 },
                        reward: { amount: '0', rewardTimelockTimeSpanInSeconds: 3600, rewardToken: '', rewardRecipientAddress: '' },
                    },
                    solverId: 'mock-solver',
                }
            }
            if (sourceNetwork.startsWith('solana:')) {
                setKey(url)
                setLoading(false)
                const amount = urlParams.get('amount') ?? '1000000000'
                return {
                    quote: {
                        signature: 'mock-solana-devnet-quote',
                        totalFee: '5000000',
                        receiveAmount: String(BigInt(amount) * 95n / 100n),
                        sourceSolverAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                        destinationSolverAddress: '0x0000000000000000000000000000000000000001',
                        quoteExpirationTimestampInSeconds: Math.floor(Date.now() / 1000) + 3600,
                        route: {
                            source: { networkSlug: sourceNetwork, tokenSymbol: 'SOL', tokenContract: '', tokenDecimals: 9 },
                            destination: { networkSlug: urlParams.get('destinationNetwork')!, tokenSymbol: 'ETH', tokenContract: '', tokenDecimals: 18 },
                            minAmountInSource: '10000000',
                            maxAmountInSource: '10000000000000',
                        },
                        timelock: { timelockTimeSpanInSeconds: 69 },
                        reward: { amount: '0', rewardTimelockTimeSpanInSeconds: 3600, rewardToken: '', rewardRecipientAddress: '' },
                    },
                    solverId: 'mock-solver',
                }
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
        }
    )

    return {
        quote: (quoteError || !canGetQuote) ? undefined : data?.quote,
        solverId: (quoteError || !canGetQuote) ? undefined : data?.solverId,
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
