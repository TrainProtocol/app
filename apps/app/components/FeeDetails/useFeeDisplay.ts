import { useMemo } from 'react'
import type { SwapQuote } from '@train-protocol/react'
import { SwapFormValues } from '../DTOs/SwapFormValues'
import useWallet from '@/hooks/useWallet'
import useSWRGas from '@/lib/gases/useSWRGas'
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper'
import formatAmount from '@/lib/formatAmount'
import { truncateDecimals } from '../utils/RoundDecimals'

/** `$x.xx`, or `<$0.01` for dust. `Free` when the amount is exactly zero and `freeWhenZero` is set. */
function formatUsd(amount: number, freeWhenZero: boolean): string {
    if (freeWhenZero && amount === 0) return 'Free'
    return amount < 0.01 ? '<$0.01' : `$${amount.toFixed(2)}`
}

/**
 * Source-chain gas estimate for the current route, in native token and USD.
 *
 * `gasFeeInUsd` is the raw number (for NumberFlow); `displayGasFeeInUsd` is the
 * preformatted string; `truncatedGas` is the native amount for tooltips.
 */
export function useGasFeeDisplay(values: SwapFormValues) {
    const { wallets } = useWallet(values.from, 'withdrawal')
    const wallet = wallets?.[0]

    const { gasData, isGasLoading } = useSWRGas(wallet?.address, values.from, values.fromCurrency)
    const gasTokenPriceInUsd = resolveTokenUsdPrice(gasData?.token)
    const gasFeeInUsd = gasData && gasTokenPriceInUsd ? gasData.gas * gasTokenPriceInUsd : null

    return {
        gasData,
        isGasLoading,
        gasFeeInUsd,
        displayGasFeeInUsd: gasFeeInUsd != null ? formatUsd(gasFeeInUsd, false) : null,
        truncatedGas: gasData?.gas ? truncateDecimals(gasData.gas, Math.min(gasData.token?.decimals, 8)) : null,
    }
}

/**
 * The quote's total fee in source-token and USD terms.
 *
 * `displayFee` is the bare truncated amount (or `Free`) and `feeSymbol` the token symbol,
 * kept separate so tooltips can split them; `displayFeeWithSymbol` joins them, omitting
 * the symbol for the `Free` case.
 */
export function useSwapFeeDisplay(values: SwapFormValues, quote: SwapQuote | undefined) {
    const fromCurrency = values.fromCurrency

    const feeAmount = useMemo(() => {
        if (!quote?.totalFee || !fromCurrency) return null
        return formatAmount(BigInt(quote.totalFee), fromCurrency.decimals)
    }, [quote?.totalFee, fromCurrency])

    const feeInUsd = useMemo(() => {
        if (feeAmount === null || feeAmount === undefined) return null
        const priceInUsd = resolveTokenUsdPrice(fromCurrency)
        if (!priceInUsd) return null
        return Number(feeAmount) * priceInUsd
    }, [feeAmount, fromCurrency])

    const displayFee = feeAmount !== null && feeAmount !== undefined
        ? (Number(feeAmount) === 0 ? 'Free' : truncateDecimals(Number(feeAmount), Math.min(fromCurrency?.decimals || 8, 8)))
        : null

    const feeSymbol = fromCurrency?.symbol || ''

    return {
        feeAmount,
        feeInUsd,
        displayFeeInUsd: feeInUsd != null ? formatUsd(feeInUsd, true) : null,
        displayFee,
        feeSymbol,
        displayFeeWithSymbol: displayFee === null
            ? null
            : displayFee === 'Free' ? 'Free' : `${displayFee} ${feeSymbol}`,
    }
}
