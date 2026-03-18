import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Network } from '@train-protocol/sdk'
import { useTrainContext } from './TrainContext'
import { trainQueryKeys } from '../internal/queryKeys'

export interface NetworksContextValue {
    networks: Network[]
    prices: Record<string, number>
    isLoading: boolean
    error: Error | null
    refetchNetworks: () => Promise<void>
    refetchPrices: () => Promise<void>
}

export const NetworksContext = createContext<NetworksContextValue | null>(null)

export function useNetworksContext(): NetworksContextValue {
    const ctx = useContext(NetworksContext)
    if (!ctx) {
        throw new Error('useNetworksContext must be used within a <TrainProvider>')
    }
    return ctx
}

export function NetworksProvider({ children }: { children: ReactNode }) {
    const { apiClient } = useTrainContext()

    const networksQuery = useQuery({
        queryKey: trainQueryKeys.networks(),
        queryFn: () => apiClient.getNetworks(),
        staleTime: 5 * 60_000,
    })

    const pricesQuery = useQuery({
        queryKey: trainQueryKeys.prices(),
        queryFn: () => apiClient.getPrices(),
        staleTime: 60_000,
        retry: false,
    })

    const refetchNetworks = useCallback(async () => {
        await networksQuery.refetch()
    }, [networksQuery])

    const refetchPrices = useCallback(async () => {
        await pricesQuery.refetch()
    }, [pricesQuery])

    const value = useMemo<NetworksContextValue>(() => ({
        networks: networksQuery.data ?? [],
        prices: pricesQuery.data ?? {},
        isLoading: networksQuery.isLoading,
        error: networksQuery.error instanceof Error ? networksQuery.error : networksQuery.error ? new Error(String(networksQuery.error)) : null,
        refetchNetworks,
        refetchPrices,
    }), [networksQuery.data, networksQuery.isLoading, networksQuery.error, pricesQuery.data, refetchNetworks, refetchPrices])

    return (
        <NetworksContext.Provider value={value}>
            {children}
        </NetworksContext.Provider>
    )
}
