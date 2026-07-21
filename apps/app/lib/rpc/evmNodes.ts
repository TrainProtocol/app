import { NetworkNode } from '@/Models/Network';
import chainlistRpcs from './data/chainlistRpcs.json'

type ChainlistEntry = { chainId: number; rpc: { url: string; tracking: string | null }[] }

/**
 * Exclude only providers that explicitly track user data ('yes'). We allow
 * 'none', 'limited', and untagged (null) entries — many of the most reliable
 * public nodes (publicnode, official chain RPCs like arbitrum.io) are simply
 * untagged in chainlist, and the old `none|limited`-only allowlist was dropping
 * them. That left chains like Arbitrum Sepolia resolving to only the slow/broken
 * tail (zan, onfinality). RPC calls here read public block data, so provider
 * privacy is a minor concern relative to reliability.
 */
const BLOCKED_TRACKING = new Set(['yes'])

/**
 * Providers ranked by reliability and latency from live testing.
 * Lower index = higher priority. Providers not in this list are appended after.
 * Tested against Ethereum Sepolia, Arbitrum Sepolia, and Base Sepolia (2026-07-21).
 */
const PRIORITY_PROVIDERS = [
    'publicnode',   // 3/3 on all chains, 81-130ms — fastest reliable, in-sync
    'ethpandaops',  // 3/3 Eth Sepolia, ~90ms
    '0xrpc',        // 3/3 Eth Sepolia, ~145ms
    'nodies',       // 3/3 Base + Eth Sepolia, ~175ms
    '1rpc',         // 3/3 Eth Sepolia, ~167ms
    'sentio',       // 3/3 Base + Eth Sepolia, ~230ms
    'pocket',       // 3/3 Arb + Eth (~130ms), but slow on Base Sepolia (~2.8s)
    'zan',          // 3/3 Arb + Eth Sepolia, reliable but slow (~375-530ms)
    'onfinality',   // unreliable: Eth ok, Base ~1.7s, Arb Sepolia failing (0/3)
]

/** Providers known to be dead, broken, or unsafe — excluded from results. */
const BLOCKED_PROVIDERS = new Set([
    'stackup',      // connection failures on all chains
    'therpc',       // connection failures / timeouts on all chains
    'omniatech',    // HTTP 521 on all chains
    'blastapi',     // HTTP 403
    'unifra',       // connection failures
    '4everland',    // HTTP 401/403
    'owlracle',     // HTTP 502
    'notadegen',    // connection failures
    'shardeum',     // connection failures
    'alchemy',      // HTTP 429 without API key (keyed ${...} URLs are filtered earlier)
    'drpc',         // fast but serves STALE blocks on Arb Sepolia (~1.4M behind) — consensus hazard
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
        (entry) => !BLOCKED_TRACKING.has(entry.tracking ?? ''),
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
