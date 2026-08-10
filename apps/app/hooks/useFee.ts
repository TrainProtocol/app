import { useMemo, useState, useEffect, useCallback } from 'react'
import { parseUnits, formatUnits } from 'viem'
import { SwapFormValues } from '../components/DTOs/SwapFormValues'
import type { SwapQuote } from '@train-protocol/react'
import { ExtendedToken, Token } from '../Models/Network'
import { useQuote } from '@train-protocol/react'
import { useUsdModeStore } from '@/stores/usdModeStore'
import { captureEvent } from '@/lib/faro'

type UseQuoteData = {
    quote?: SwapQuote
    solverId?: string
    quoteError?: QuoteError
    solverErrorMessage?: string
    isQuoteLoading: boolean
    isDebouncing: boolean
    mutateFee: () => void
    refreshQuote: () => Promise<SwapQuote | undefined>
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

    const { bestQuote, bestSolver, quoteErrors, isLoading, error, refetch } = useQuote({
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

    const isUsdMode = useUsdModeStore(s => s.isUsdMode)
    const limitToken = (isReverse ? toCurrency : fromCurrency) as ExtendedToken | undefined
    const rawSolverError = !bestQuote && hasQuoteParams && hasValidAmount
        ? quoteErrors?.find(e => e.message)?.message
        : undefined
    const solverErrorMessage = rawSolverError
        ? resolveErrorMessage(rawSolverError, limitToken, isUsdMode)
        : undefined
    const refreshQuote = useCallback(() => refetch(), [refetch])

    // Funnel telemetry: one quote_received / quote_failed per unique route+amount,
    // deduped module-wide since both the form and the swap modal run this hook.
    const quoteRouteKey = canGetQuote
        ? `${from}>${to}:${fromCurrency?.symbol}>${toCurrency?.symbol}:${debouncedAmount}:${isReverse ? 'r' : 'f'}`
        : undefined
    useEffect(() => {
        if (!quoteRouteKey) return
        const routeAttrs = {
            source_network: from,
            destination_network: to,
            source_token: fromCurrency?.symbol,
            destination_token: toCurrency?.symbol,
            amount: rawAmount != null ? String(rawAmount) : undefined,
            is_reverse: isReverse,
        }
        if (bestQuote) {
            trackQuoteOnce(`ok:${quoteRouteKey}`, 'quote_received', {
                ...routeAttrs,
                solver_id: bestSolver?.solver?.id,
            })
        } else if (rawSolverError) {
            const limitMatch = rawSolverError.match(/(max|min)\s*amount/i)
            trackQuoteOnce(`err:${quoteRouteKey}`, 'quote_failed', {
                ...routeAttrs,
                reason: limitMatch ? `limit_${limitMatch[1].toLowerCase()}` : 'no_quote',
                message: rawSolverError,
            })
        } else if (error) {
            trackQuoteOnce(`apierr:${quoteRouteKey}`, 'quote_failed', {
                ...routeAttrs,
                reason: 'request_error',
                message: (error as Error)?.message,
            })
        }
    }, [quoteRouteKey, bestQuote, rawSolverError, error])

    return {
        quote: (error || !hasQuoteParams || !hasValidAmount) ? undefined : bestQuote as SwapQuote | undefined,
        solverId: (error || !hasQuoteParams || !hasValidAmount) ? undefined : bestSolver?.solver?.id,
        isQuoteLoading: isLoading || isDebouncing,
        isDebouncing,
        quoteError: error as unknown as QuoteError | undefined,
        solverErrorMessage,
        mutateFee: refetch,
        refreshQuote,
    }
}

export function transformFormValuesToQuoteArgs(values: SwapFormValues): Props | undefined {
    return {
        amount: values.amount,
        receiveAmount: values.receiveAmount,
        from: values.from?.caip2Id,
        to: values.to?.caip2Id,
        fromCurrency: values.fromCurrency,
        toCurrency: values.toCurrency,
    }
}

const trackedQuoteKeys = new Set<string>()
function trackQuoteOnce(key: string, name: string, attrs: Record<string, unknown>) {
    if (trackedQuoteKeys.has(key)) return
    trackedQuoteKeys.add(key)
    captureEvent(name, attrs)
}

function resolveErrorMessage(message: string, token: ExtendedToken | undefined, isUsdMode: boolean): string {
    return formatLimitMessage(message, token, isUsdMode) ?? "Can't get quote"
}

function formatLimitMessage(message: string, token: ExtendedToken | undefined, isUsdMode: boolean): string | undefined {
    if (!token) return undefined
    const match = message.match(/(max|min)\s*amount[^\d]*(\d+)/i)
    if (!match) return undefined
    const kind = match[1].toLowerCase() === 'max' ? 'Max' : 'Min'
    try {
        const tokenAmount = formatUnits(BigInt(match[2]), token.decimals)
        if (isUsdMode && token.priceInUsd && token.priceInUsd > 0) {
            const usd = Number(tokenAmount) * token.priceInUsd
            return `${kind} amount is $${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
        const [whole, frac = ''] = tokenAmount.split('.')
        const trimmed = frac.slice(0, 6).replace(/0+$/, '')
        const display = trimmed ? `${whole}.${trimmed}` : whole
        return `${kind} amount is ${display}${token.symbol ? ` ${token.symbol}` : ''}`
    } catch {
        return undefined
    }
}

/** Build quote params from atomic swap state (for Swap step). */
export function buildQuoteParamsFromAtomic(params: {
    from?: string
    to?: string
    fromCurrency?: Token
    toCurrency?: Token
    amount?: string | number
    receiveAmount?: string | number
}): Props | undefined {
    if (!params.from || !params.to || !params.fromCurrency || !params.toCurrency || (!params.amount && !params.receiveAmount)) return undefined
    return {
        from: params.from,
        to: params.to,
        fromCurrency: params.fromCurrency,
        toCurrency: params.toCurrency,
        amount: params.amount ? String(params.amount) : undefined,
        receiveAmount: params.receiveAmount ? String(params.receiveAmount) : undefined,
    }
}
