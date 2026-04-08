import { NetworkNode } from '@/Models/Network';
import chainlistRpcs from './data/chainlistRpcs.json'

type ChainlistEntry = { chainId: number; rpc: { url: string; tracking: string | null }[] }

const ALLOWED_TRACKING = new Set(['none', 'limited'])

/**
 * Providers ranked by reliability and latency from live testing.
 * Lower index = higher priority. Providers not in this list are appended after.
 * Tested against Ethereum Sepolia, Arbitrum Sepolia, and Base Sepolia (2026-03-18).
 */
const PRIORITY_PROVIDERS = [
    'publicnode',   // 100% success, ~180-210ms avg across all chains
    'nodies',       // 100% success, ~165-189ms avg (Eth Sepolia, Base Sepolia)
    'drpc',         // 100% success, ~200-240ms avg (Arb Sepolia, Base Sepolia)
    '0xrpc',        // 100% success, ~334ms avg (Eth Sepolia)
    '1rpc',         // 100% success, ~379ms avg (Eth Sepolia)
    'sentio',       // 100% success, ~340-435ms avg (Eth Sepolia, Base Sepolia)
    'pocket',       // 100% success, ~280-580ms avg, slower but reliable
    'zan',          // 100% success, ~650-690ms avg, slow but reliable
    'onfinality',   // Partially reliable, rate-limited on some chains
]

/** Providers known to be dead or broken — excluded from results. */
const BLOCKED_PROVIDERS = new Set([
    'stackup',      // connection failures on all chains
    'therpc',       // timeouts on all chains
    'omniatech',    // HTTP 521 errors
    'blastapi',     // HTTP 403
    'unifra',       // connection failures
    '4everland',    // HTTP 403
    'owlracle',     // HTTP 401
])

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
 * Results are sorted by provider priority for optimal consensus verification.
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
                const providerName = extractProviderName(url)
                if (!BLOCKED_PROVIDERS.has(providerName)) {
                    results.push({ url: normalized, providerName })
                }
            }
        }
    }

    results.sort((a, b) => {
        const aIdx = PRIORITY_PROVIDERS.indexOf(a.providerName)
        const bIdx = PRIORITY_PROVIDERS.indexOf(b.providerName)
        const aPriority = aIdx === -1 ? PRIORITY_PROVIDERS.length : aIdx
        const bPriority = bIdx === -1 ? PRIORITY_PROVIDERS.length : bIdx
        return aPriority - bPriority
    })

    return results
}
