import type { ResolvedNode } from './types'

function extractProviderName(url: string): string {
    try {
        const parts = new URL(url).hostname.split('.')
        return parts.length >= 2 ? parts[parts.length - 2] : parts[0]
    } catch {
        return 'unknown'
    }
}

/**
 * Resolve EVM RPC nodes for a given chainId from chainlist-rpcs.
 */
export async function resolveEvmNodes(chainId: string): Promise<ResolvedNode[]> {
    const { get_rpcs_for_chain } = await import('chainlist-rpcs')
    const rpcs = get_rpcs_for_chain({
        chain_id: Number(chainId),
        allowed_tracking: ['none', 'limited'],
    })

    if (!Array.isArray(rpcs)) return []

    const seen = new Set<string>()
    const results: ResolvedNode[] = []

    for (const entry of rpcs) {
        const url = typeof entry === 'string' ? entry : entry.url
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
