import { SwapFormValues } from '../DTOs/SwapFormValues';
import ResizablePanel from '../ResizablePanel';
import { FC, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import type { SwapQuote } from '@train-protocol/react';
import GasIcon from '../Icons/GasIcon';
import Clock from '../Icons/Clock';
import AverageCompletionTime from '../Common/AverageCompletionTime';
import NumberFlow from '@number-flow/react';
import { DetailedEstimates } from './SwapQuote/DetailedEstimates';
import { QuoteAccordion } from './QuoteAccordion';
import { useGasFeeDisplay, useSwapFeeDisplay } from './useFeeDisplay';

export interface QuoteComponentProps {
    quote: SwapQuote | undefined;
    isQuoteLoading?: boolean;
    values: SwapFormValues;
}

export default function QuoteDetails({ values, quote, isQuoteLoading }: QuoteComponentProps) {
    const { toCurrency: toAsset, fromCurrency } = values || {};
    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

    if (!quote) return null

    return (
        <QuoteAccordion
            isOpen={isAccordionOpen}
            onOpenChange={setIsAccordionOpen}
            triggerDataAttr="see-swap-details"
            triggerClassName={clsx(
                'p-3.5 pr-5 w-full rounded-2xl flex items-center justify-between transition-colors duration-200 hover:bg-secondary-400 mt-2',
                {
                    'bg-secondary-500': !isAccordionOpen,
                    'bg-secondary-400': isAccordionOpen,
                    'animate-pulse-strong': isQuoteLoading && !isAccordionOpen
                }
            )}
            trigger={
                <>
                    {isAccordionOpen ? (
                        <p className='text-sm h-[22px]'>Details</p>
                    ) : (
                        <DetailsButton quote={quote} isQuoteLoading={isQuoteLoading} values={values} />
                    )}
                    <ChevronDown className='h-3.5 w-3.5 text-secondary-text' />
                </>
            }
        >
            <ResizablePanel>
                {(quote || isQuoteLoading) && fromCurrency && toAsset && (
                    <DetailedEstimates
                        values={values}
                        quote={quote}
                    />
                )}
            </ResizablePanel>
        </QuoteAccordion>
    )
}

export const DetailsButton: FC<QuoteComponentProps> = ({ quote, isQuoteLoading, values }) => {
    const { gasFeeInUsd } = useGasFeeDisplay(values)
    const { displayFeeInUsd, displayFeeWithSymbol } = useSwapFeeDisplay(values, quote)

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
                            <GasIcon className='h-4 w-4 text-secondary-text' />
                        <NumberFlow className="text-primary-text text-sm leading-6" value={gasFeeInUsd < 0.01 ? 0.01 : gasFeeInUsd} prefix={gasFeeInUsd < 0.01 ? '<$' : '$'} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                    </div>
                    <div className="w-px h-3 bg-primary-text-tertiary rounded-2xl" />
                </>
            ) : null}
            {(displayFeeInUsd || displayFeeWithSymbol) && (
                <div className={clsx(
                    "inline-flex items-center gap-1 text-sm",
                    { "animate-pulse-strong": isQuoteLoading }
                )}>
                    <span className="text-secondary-text">Fee:</span>
                    <span className="text-primary-text">{displayFeeInUsd || displayFeeWithSymbol}</span>
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
