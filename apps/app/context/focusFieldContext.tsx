import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { QuoteDirection } from '@train-protocol/react';

export type FocusField = QuoteDirection;

type FocusFieldContextValue = {
    focusField: FocusField;
    setFocusField: (field: FocusField) => void;
};

const FocusFieldContext = createContext<FocusFieldContextValue | null>(null);

export const FocusFieldProvider = ({ children }: { children: ReactNode }) => {
    const [focusField, setFocusField] = useState<FocusField>('source');
    const value = useMemo(() => ({ focusField, setFocusField }), [focusField]);
    return (
        <FocusFieldContext.Provider value={value}>
            {children}
        </FocusFieldContext.Provider>
    );
};

export const useFocusField = () => {
    const ctx = useContext(FocusFieldContext);
    if (!ctx) throw new Error('useFocusField must be used within FocusFieldProvider');
    return ctx;
};
