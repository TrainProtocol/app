import { useRpcConfigStore } from '@/stores/rpcConfigStore'
import { Network } from '@/Models/Network'
import { http, fallback, type Transport } from 'viem'

/**
 * Get the effective RPC URLs for a network, respecting user overrides.
 * Works outside React (balance providers, gas providers) via Zustand getState().
 */
export function getNetworkRpcUrls(network: Network): string[] {
    const store = useRpcConfigStore.getState()
    return store.getEffectiveRpcUrls(network)
}

/**
 * Get the primary effective RPC URL (first in priority order).
 */
export function getNetworkRpcUrl(network: Network): string {
    return getNetworkRpcUrls(network)[0] ?? ''
}

/**
 * Build a viem Transport with fallback across all effective RPC URLs.
 * Throws if no RPC URLs are available for the network.
 */
export function buildNetworkTransport(
    network: Network,
    options?: { timeout?: number; retryCount?: number },
): Transport {
    const urls = getNetworkRpcUrls(network)
    if (urls.length === 0) {
        throw new Error(`No RPC URLs available for network ${network.caip2Id}`)
    }
    if (urls.length > 1) {
        return fallback(urls.map(u => http(u, options)))
    }
    return http(urls[0], options)
}
