import { useCallback } from 'react'
import type { Caip2Id } from '@train-protocol/react'
import { useSettingsState } from '@/context/settings'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'

/**
 * Resolves the effective RPC URL for a wallet bridge, respecting user RPC overrides.
 *
 * `fallbackPrefix` is the CAIP-2 namespace prefix used when no `caip2Id` is supplied
 * (e.g. `'aztec:'`); pass `null` to require an exact `caip2Id` match instead.
 *
 * Subscribes to `getEffectiveRpcUrls` so the returned callback's identity changes when
 * custom RPCs are edited — bridges keep it in their adapter `useMemo` deps.
 */
export function useBridgeRpcUrl(fallbackPrefix: string | null) {
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    return useCallback((caip2Id?: Caip2Id): string => {
        const network = networks.find(n =>
            caip2Id
                ? n.caip2Id === (caip2Id as string)
                : fallbackPrefix
                    ? n.caip2Id?.toLowerCase().startsWith(fallbackPrefix.toLowerCase())
                    : false
        )
        if (!network) return ''
        // getEffectiveRpcUrls already falls back to network.nodes when no override is set.
        return getEffectiveRpcUrls(network)[0] ?? ''
    }, [networks, getEffectiveRpcUrls, fallbackPrefix])
}
