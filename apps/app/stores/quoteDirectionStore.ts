import { createWithEqualityFn as create } from 'zustand/traditional'
import type { QuoteDirection } from '@train-protocol/react'

type QuoteDirectionState = {
    quoteDirection: QuoteDirection
    setQuoteDirection: (direction: QuoteDirection) => void
}

export const useQuoteDirectionStore = create<QuoteDirectionState>()((set) => ({
    quoteDirection: 'source',
    setQuoteDirection: (direction) => set({ quoteDirection: direction }),
}))
