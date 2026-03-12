import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Network } from '@train-protocol/sdk'
import { useTrainContext } from './TrainContext'

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
    const [networks, setNetworks] = useState<Network[]>([])
    const [prices, setPrices] = useState<Record<string, number>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const refetchNetworks = useCallback(async () => {
        try {
            const data = await apiClient.getNetworks()
            setNetworks(data)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
        }
    }, [apiClient])

    const refetchPrices = useCallback(async () => {
        try {
            const data = await apiClient.getPrices()
            setPrices(data)
        } catch {
            // Prices are non-critical, don't set error
        }
    }, [apiClient])

    useEffect(() => {
        setIsLoading(true)
        Promise.all([refetchNetworks(), refetchPrices()]).finally(() => {
            setIsLoading(false)
        })
    }, [refetchNetworks, refetchPrices])

    return (
        <NetworksContext.Provider
            value={{ networks, prices, isLoading, error, refetchNetworks, refetchPrices }}
        >
            {children}
        </NetworksContext.Provider>
    )
}
