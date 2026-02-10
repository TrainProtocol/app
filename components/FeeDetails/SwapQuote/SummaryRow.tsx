import { FC, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { SwapFormValues } from '../../DTOs/SwapFormValues'
import { SwapQuote } from '@/lib/trainApiClient'
import clsx from 'clsx'
import { GasFee } from './DetailedEstimates'
import NumberFlow from '@number-flow/react'
import formatAmount from '@/lib/formatAmount'
import GasIcon from '@/components/Icons/GasIcon'
import Clock from '@/components/Icons/Clock'
import AverageCompletionTime from '@/components/Common/AverageCompletionTime'
import useWallet from '@/hooks/useWallet'
import useSWRGas from '@/lib/gases/useSWRGas'
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper'

export const SummaryRow: FC<{
    isQuoteLoading?: boolean
    values: SwapFormValues
    onOpen?: () => void
    isOpen?: boolean
    quote: SwapQuote | undefined
}> = ({ quote, isQuoteLoading, values, onOpen, isOpen }) => {
    const receiveAmount = useMemo(() => {
        if (!quote?.receiveAmount || !values.toCurrency) return null
        return formatAmount(quote.receiveAmount, values.toCurrency.decimals)
    }, [quote?.receiveAmount, values.toCurrency])

    return (
        <div className={clsx("flex flex-col w-full p-2", { "pb-0 -mb-1": isOpen })}>
            <div className="flex items-center w-full justify-between gap-1 text-sm px-2 py-3">
                <div className="inline-flex items-center text-left text-secondary-text">
                    <label>You&apos;ll receive</label>
                </div>
                <div className="text-right text-primary-text h-5">
                    {receiveAmount !== null && receiveAmount !== undefined && !isNaN(receiveAmount) && (
                        <NumberFlow
                            value={receiveAmount}
                            trend={0}
                            format={{ maximumFractionDigits: values.toCurrency?.decimals || 2 }}
                            suffix={` ${values?.toCurrency?.symbol || ''}`}
                        />
                    )}
                </div>
            </div>

            {isOpen && <GasFee values={values} quote={quote} />}

            <div className={`${isOpen ? "hidden" : ""} flex items-center w-full justify-between px-2 py-3`}>
                <DetailsButton quote={quote} isQuoteLoading={isQuoteLoading} values={values} />
                <button
                    data-attr="see-swap-details"
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onOpen?.()
                    }}
                    className="flex items-center text-secondary-text text-sm whitespace-nowrap gap-0.5 hover:text-primary-text"
                    aria-label="See details"
                >
                    <span>See details</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
}

const DetailsButton: FC<{
    quote: SwapQuote | undefined
    isQuoteLoading?: boolean
    values: SwapFormValues
}> = ({ quote, isQuoteLoading, values }) => {
    const { wallets } = useWallet(values.from, 'withdrawal')
    const wallet = wallets?.[0]

    const { gas } = useSWRGas(wallet?.address, values.from, values.fromCurrency)
    const gasTokenPriceInUsd = resolveTokenUsdPrice(values.fromCurrency, quote)
    const gasFeeInUsd = gas && gasTokenPriceInUsd ? gas * gasTokenPriceInUsd : null

    // Train doesn't have avg_completion_time in SwapQuote yet
    const averageCompletionTime = undefined

    return (
        <div className='flex items-center gap-1 space-x-3'>
            {gasFeeInUsd && (
                <>
                    <div className={clsx(
                        "inline-flex items-center gap-1",
                        { "animate-pulse-strong": isQuoteLoading }
                    )}>
                        <div className='p-0.5'>
                            <GasIcon className='h-4 w-4 text-secondary-text' />
                        </div>
                        <NumberFlow
                            className="text-primary-text text-sm leading-6"
                            value={gasFeeInUsd < 0.01 ? 0.01 : gasFeeInUsd}
                            prefix={gasFeeInUsd < 0.01 ? '<$' : '$'}
                        />
                    </div>
                    <div className="w-px h-3 bg-primary-text-tertiary rounded-2xl" />
                </>
            )}
            {averageCompletionTime && (
                <div className={clsx(
                    "text-right inline-flex items-center gap-1 text-sm",
                    { "animate-pulse-strong": isQuoteLoading }
                )}>
                    <div className='p-0.5'>
                        <Clock className='h-4 w-4 text-secondary-text' />
                    </div>
                    <AverageCompletionTime className="text-primary-text" avgCompletionTime={averageCompletionTime} />
                </div>
            )}
        </div>
    )
}
