import { ReactNode } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../shadcn/accordion'

type QuoteAccordionProps = {
    isOpen: boolean
    onOpenChange: (isOpen: boolean) => void
    trigger: ReactNode
    /** Rendered below the content while open (e.g. a "Close details" button). */
    footer?: ReactNode
    triggerClassName?: string
    /** Set when the trigger handles its own open/close, so clicking the row itself does nothing. */
    inertTrigger?: boolean
    /** PostHog `data-attr` for the trigger; omit when a nested control carries it instead. */
    triggerDataAttr?: string
    children: ReactNode
}

/**
 * The shared accordion shell behind the two quote panels — the collapsed swap form's
 * `QuoteDetails` and the in-progress swap's `SwapQuote`. Only the trigger and footer differ.
 */
export function QuoteAccordion({
    isOpen,
    onOpenChange,
    trigger,
    footer,
    triggerClassName,
    inertTrigger,
    triggerDataAttr,
    children,
}: QuoteAccordionProps) {
    return (
        <Accordion
            type='single'
            collapsible
            className='w-full'
            value={isOpen ? 'quote' : ''}
            onValueChange={(value) => onOpenChange(value === 'quote')}
        >
            <AccordionItem value='quote' className='bg-secondary-500 rounded-2xl'>
                <AccordionTrigger
                    data-attr={triggerDataAttr}
                    onClick={inertTrigger ? (e) => e.preventDefault() : undefined}
                    className={triggerClassName}
                >
                    {trigger}
                </AccordionTrigger>
                <AccordionContent className='rounded-2xl'>
                    {children}
                </AccordionContent>
                {footer}
            </AccordionItem>
        </Accordion>
    )
}
