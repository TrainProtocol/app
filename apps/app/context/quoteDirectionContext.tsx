import { createContext, useContext, useState, type ReactNode } from 'react';
import type { QuoteDirection } from '@train-protocol/react';

type QuoteDirectionContextValue = {
    quoteDirection: QuoteDirection;
    setQuoteDirection: (direction: QuoteDirection) => void;
};

const QuoteDirectionContext = createContext<QuoteDirectionContextValue | null>(null);

export const QuoteDirectionProvider = ({ children }: { children: ReactNode }) => {
    const [quoteDirection, setQuoteDirection] = useState<QuoteDirection>('source');

    return (
        <QuoteDirectionContext.Provider value={{ quoteDirection, setQuoteDirection }}>
            {children}
        </QuoteDirectionContext.Provider>
    );
};

export const useQuoteDirection = () => {
    const ctx = useContext(QuoteDirectionContext);
    if (!ctx) throw new Error('useQuoteDirection must be used within QuoteDirectionProvider');
    return ctx;
};
