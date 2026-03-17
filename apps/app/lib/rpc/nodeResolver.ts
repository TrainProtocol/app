import { NON_EVM_NODES } from './nonEvmNodes'
import { resolveEvmNodes } from './evmNodes'
import { NetworkNode } from '@train-protocol/sdk';
import { NetworkTypes } from '@/Models/Network';

/**
 * Resolves RPC node URLs for a given CAIP-2 network ID.
 * Existing nodes (from API/mock) get priority, then public RPCs are appended.
 */
export async function resolveNodes(
    caip2Id: string,
    existingNodes?: NetworkNode[],
): Promise<NetworkNode[]> {
    const [namespace, chainId] = caip2Id.split(':') 
    const seen = new Set<string>()
    const results: NetworkNode[] = []

    const add = (node: NetworkNode) => {
        const key = node.url.replace(/\/+$/, '').toLowerCase()
        if (!seen.has(key)) {
            seen.add(key)
            results.push(node)
        }
    }

    // 1. Existing nodes first (known to work with this app)
    if (existingNodes?.length) {
        for (const n of existingNodes) {
            add({ url: n.url, providerName: n.providerName })
        }
    }

    // 2. Dynamic resolution by chain type
    if (namespace === NetworkTypes.EVM) {
        try {
            for (const n of await resolveEvmNodes(chainId)) {
                add(n)
            }
        } catch (e) {
            console.warn(`[resolveNodes] Failed to resolve dynamic EVM nodes for ${caip2Id}:`, e)
        }
    } else {
        for (const n of NON_EVM_NODES[caip2Id] ?? []) {
            add(n)
        }
    }

    return results
}
