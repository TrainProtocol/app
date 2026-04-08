import { useNetworksContext } from '../providers/NetworksProvider'

export function usePrices(): {
    prices: Record<string, number>
    isLoading: boolean
    refetch: () => Promise<void>
} {
    const { prices, isLoading, refetchPrices } = useNetworksContext()
    return { prices, isLoading, refetch: refetchPrices }
}
