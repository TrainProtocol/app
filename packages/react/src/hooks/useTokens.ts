import { useMemo } from 'react'
import { useNetworksContext } from '../providers/NetworksProvider'
import type { Token } from '@train-protocol/sdk'

export function useTokens(caip2Id: string | undefined): Token[] {
    const { networks } = useNetworksContext()
    return useMemo(
        () => {
            if (!caip2Id) return []
            const network = networks.find(n => n.caip2Id === caip2Id)
            return network?.tokens ?? []
        },
        [networks, caip2Id],
    )
}
