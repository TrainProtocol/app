import { NetworkNode } from '@train-protocol/sdk'
import chainlistRpcs from './data/chainlistRpcs.json'

type ChainlistEntry = { chainId: number; rpc: { url: string; tracking: string | null }[] }

const ALLOWED_TRACKING = new Set(['none', 'limited'])

function extractProviderName(url: string): string {
    try {
        const parts = new URL(url).hostname.split('.')
        return parts.length >= 2 ? parts[parts.length - 2] : parts[0]
    } catch {
        return 'unknown'
    }
}

/**
 * Resolve EVM RPC nodes for a given chainId from static chainlist data.
 */
export async function resolveEvmNodes(chainId: string): Promise<NetworkNode[]> {
    const chain = (chainlistRpcs as ChainlistEntry[]).find(
        (c) => c.chainId === Number(chainId),
    )
    if (!chain) return []

    const rpcs = chain.rpc.filter(
        (entry) => entry.tracking != null && ALLOWED_TRACKING.has(entry.tracking),
    )

    const seen = new Set<string>()
    const results: NetworkNode[] = []

    for (const entry of rpcs) {
        const { url } = entry
        if (
            typeof url === 'string' &&
            url.startsWith('https://') &&
            !url.includes('${')
        ) {
            const normalized = url.replace(/\/+$/, '')
            const key = normalized.toLowerCase()
            if (!seen.has(key)) {
                seen.add(key)
                results.push({ url: normalized, providerName: extractProviderName(url) })
            }
        }
    }

    return results
}
