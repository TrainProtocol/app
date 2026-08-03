import { FC, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SwapQuote } from '@train-protocol/react'
import { SwapFormValues } from '../../DTOs/SwapFormValues'
import { SummaryRow } from './SummaryRow'
import { DetailedEstimates } from './DetailedEstimates'
import { QuoteAccordion } from '../QuoteAccordion'
import { useSelectedAccount } from '@/context/swapAccounts'

interface QuoteComponentProps {
    quote: SwapQuote | undefined;
    isQuoteLoading?: boolean;
    values: SwapFormValues;
}

const SwapQuoteComp: FC<QuoteComponentProps> = ({ values, quote, isQuoteLoading }) => {
    const [isOpen, setIsOpen] = useState(true)
    const selectedSourceAccount = useSelectedAccount("from", values?.from?.caip2Id);

    if (!quote) return null

    return (
        <QuoteAccordion
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            inertTrigger
            triggerClassName="w-full rounded-2xl flex items-center justify-between cursor-auto"
            trigger={
                <SummaryRow
                    isQuoteLoading={isQuoteLoading}
                    values={values}
                    quoteData={quote}
                    onOpen={() => setIsOpen(true)}
                    sourceAddress={selectedSourceAccount?.address}
                    isOpen={isOpen}
                />
            }
            footer={isOpen && (
                <div className="px-3.5 pb-3">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="mx-auto flex items-center justify-center gap-1 text-sm text-secondary-text hover:text-primary-text"
                    >
                        <span>Close details</span>
                        <ChevronDown className="h-3.5 w-3.5 rotate-180 transition-transform" />
                    </button>
                </div>
            )}
        >
            <DetailedEstimates
                values={values}
                quote={quote}
            />
        </QuoteAccordion>
    )
}

export default SwapQuoteComp
