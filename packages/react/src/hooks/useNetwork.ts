import { useMemo } from 'react'
import { useNetworksContext } from '../providers/NetworksProvider'
import type { Network } from '@train-protocol/sdk'

export function useNetwork(caip2Id: string | undefined): Network | undefined {
    const { networks } = useNetworksContext()
    return useMemo(
        () => caip2Id ? networks.find(n => n.caip2Id === caip2Id) : undefined,
        [networks, caip2Id],
    )
}
