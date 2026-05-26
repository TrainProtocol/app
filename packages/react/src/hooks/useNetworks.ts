import { useNetworksContext } from '../providers/NetworksProvider'
import type { Network } from '@train-protocol/sdk'

export function useNetworks(): {
    networks: Network[]
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
} {
    const { networks, isLoading, error, refetchNetworks } = useNetworksContext()
    return { networks, isLoading, error, refetch: refetchNetworks }
}
