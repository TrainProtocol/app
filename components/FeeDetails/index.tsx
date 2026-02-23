import { SwapFormValues } from '../DTOs/SwapFormValues';
import ResizablePanel from '../ResizablePanel';
import { FC, useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../shadcn/accordion';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { SwapQuote } from '@/lib/trainApiClient';
import GasIcon from '../Icons/GasIcon';
import Clock from '../Icons/Clock';
import AverageCompletionTime from '../Common/AverageCompletionTime';
import useWallet from '@/hooks/useWallet';
import useSWRGas from '@/lib/gases/useSWRGas';
import NumberFlow from '@number-flow/react';
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper';
import { DetailedEstimates } from './SwapQuote/DetailedEstimates';
import formatAmount from '@/lib/formatAmount';
import { truncateDecimals } from '../utils/RoundDecimals';

export interface QuoteComponentProps {
    quote: SwapQuote | undefined;
    isQuoteLoading?: boolean;
    values: SwapFormValues;
}

export default function QuoteDetails({ values, quote, isQuoteLoading }: QuoteComponentProps) {
    const { toCurrency: toAsset, fromCurrency, amount } = values || {};
    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

    if (!quote) return null

    return (
        <Accordion type='single' collapsible className='w-full' value={isAccordionOpen ? 'quote' : ''} onValueChange={(value) => { setIsAccordionOpen(value === 'quote') }}>
            <AccordionItem value='quote' className='bg-secondary-500 rounded-2xl'>
                <AccordionTrigger
                    data-attr="see-swap-details"
                    className={clsx(
                        'p-3.5 pr-5 w-full rounded-2xl flex items-center justify-between transition-colors duration-200 hover:bg-secondary-400 mt-2',
                        {
                            'bg-secondary-500': !isAccordionOpen,
                            'bg-secondary-400': isAccordionOpen,
                            'animate-pulse-strong': isQuoteLoading && !isAccordionOpen
                        }
                    )}>
                    {isAccordionOpen ? (
                        <p className='text-sm'>Details</p>
                    ) : (
                        <DetailsButton quote={quote} isQuoteLoading={isQuoteLoading} values={values} />
                    )}
                    <ChevronDown className='h-3.5 w-3.5 text-secondary-text' />
                </AccordionTrigger>
                <AccordionContent className='rounded-2xl'>
                    <ResizablePanel>
                        {(quote || isQuoteLoading) && fromCurrency && toAsset && (
                            <DetailedEstimates
                                values={values}
                                quote={quote}
                            />
                        )}
                    </ResizablePanel>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}

export const DetailsButton: FC<QuoteComponentProps> = ({ quote, isQuoteLoading, values }) => {
    const { wallets } = useWallet(values.from, 'withdrawal')
    const wallet = wallets?.[0]

    const { gasData } = useSWRGas(wallet?.address, values.from, values.fromCurrency)
    const gasTokenPriceInUsd = resolveTokenUsdPrice(gasData?.token)
    const gasFeeInUsd = gasData && gasTokenPriceInUsd ? gasData.gas * gasTokenPriceInUsd : null

    // Fee display in collapsed view
    const fromCurrency = values.fromCurrency
    const feeAmount = useMemo(() => {
        if (!quote?.totalFee || !fromCurrency) return null
        return formatAmount(quote.totalFee, fromCurrency.decimals)
    }, [quote?.totalFee, fromCurrency])

    const feeInUsd = useMemo(() => {
        if (feeAmount === null || feeAmount === undefined) return null
        const priceInUsd = resolveTokenUsdPrice(fromCurrency)
        if (!priceInUsd) return null
        return feeAmount * priceInUsd
    }, [feeAmount, fromCurrency, quote])

    const displayFeeInUsd = feeInUsd != null
        ? (feeInUsd === 0 ? 'Free' : feeInUsd < 0.01 ? '<$0.01' : `$${feeInUsd.toFixed(2)}`)
        : null

    const displayFee = feeAmount !== null && feeAmount !== undefined
        ? (feeAmount === 0 ? 'Free' : `${truncateDecimals(feeAmount, Math.min(fromCurrency?.decimals || 8, 8))} ${fromCurrency?.symbol || ''}`)
        : null

    // Train doesn't have avg_completion_time yet
    const averageCompletionTime = undefined

    return (
        <div className='flex items-center gap-1 space-x-3'>
            {gasFeeInUsd ? (
                <>
                    <div className={clsx(
                        "inline-flex items-center gap-1",
                        { "animate-pulse-strong": isQuoteLoading }
                    )}>
                        <div className='p-0.5'>
                            <GasIcon className='h-4 w-4 text-secondary-text' />
                        </div>
                        <NumberFlow className="text-primary-text text-sm leading-6" value={gasFeeInUsd < 0.01 ? 0.01 : gasFeeInUsd} prefix={gasFeeInUsd < 0.01 ? '<$' : '$'} />
                    </div>
                    <div className="w-px h-3 bg-primary-text-tertiary rounded-2xl" />
                </>
            ) : null}
            {(displayFeeInUsd || displayFee) && (
                <div className={clsx(
                    "inline-flex items-center gap-1 text-sm",
                    { "animate-pulse-strong": isQuoteLoading }
                )}>
                    <span className="text-secondary-text">Fee:</span>
                    <span className="text-primary-text">{displayFeeInUsd || displayFee}</span>
                </div>
            )}
            {averageCompletionTime && (
                <>
                    <div className="w-px h-3 bg-primary-text-tertiary rounded-2xl" />
                    <div className={clsx(
                        "text-right inline-flex items-center gap-1 text-sm",
                        { "animate-pulse-strong": isQuoteLoading }
                    )}>
                        <div className='p-0.5'>
                            <Clock className='h-4 w-4 text-secondary-text' />
                        </div>
                        <AverageCompletionTime className="text-primary-text" avgCompletionTime={averageCompletionTime} />
                    </div>
                </>
            )}
        </div>
    )
}
