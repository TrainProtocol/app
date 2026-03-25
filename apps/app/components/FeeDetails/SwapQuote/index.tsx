import { FC, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../shadcn/accordion'
import { ChevronDown } from 'lucide-react'
import type { SwapQuote } from '@train-protocol/react'
import { SwapFormValues } from '../../DTOs/SwapFormValues'
import { SummaryRow } from './SummaryRow'
import { DetailedEstimates } from './DetailedEstimates'

interface QuoteComponentProps {
    quote: SwapQuote | undefined;
    isQuoteLoading?: boolean;
    values: SwapFormValues;
}

const SwapQuoteComp: FC<QuoteComponentProps> = ({ values, quote, isQuoteLoading }) => {
    const [isOpen, setIsOpen] = useState(false)

    if (!quote) return null

    return (
        <Accordion
            type="single"
            collapsible
            className="w-full"
            value={isOpen ? 'quote' : ''}
            onValueChange={(v) => setIsOpen(v === 'quote')}
        >
            <AccordionItem value="quote" className="bg-secondary-500 rounded-2xl">
                <AccordionTrigger
                    onClick={(e) => e.preventDefault()}
                    className="w-full rounded-2xl flex items-center justify-between cursor-auto"
                >
                    <SummaryRow
                        isQuoteLoading={isQuoteLoading}
                        values={values}
                        quoteData={quote}
                        onOpen={() => setIsOpen(true)}
                        isOpen={isOpen}
                    />
                </AccordionTrigger>

                <AccordionContent className="rounded-2xl">
                    <DetailedEstimates
                        values={values}
                        quote={quote}
                    />
                </AccordionContent>

                {isOpen && (
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
            </AccordionItem>
        </Accordion>
    )
}

export default SwapQuoteComp
