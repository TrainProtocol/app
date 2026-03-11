import type { ResolvedNode, ChainNamespace } from './types'
import { NON_EVM_NODES } from './nonEvmNodes'
import { resolveEvmNodes } from './evmNodes'

export class NodeResolver {
    /**
     * Resolves RPC node URLs for a given CAIP-2 network ID.
     * Existing nodes (from API/mock) get priority, then public RPCs are appended.
     */
    async resolveNodes(
        caip2Id: string,
        existingNodes?: Array<{ url: string; providerName: string }>,
    ): Promise<ResolvedNode[]> {
        const [namespace, chainId] = caip2Id.split(':') as [ChainNamespace, string]
        const seen = new Set<string>()
        const results: ResolvedNode[] = []

        const add = (node: ResolvedNode) => {
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
        if (namespace === 'eip155') {
            for (const n of await resolveEvmNodes(chainId)) {
                add(n)
            }
        } else {
            for (const n of NON_EVM_NODES[caip2Id] ?? []) {
                add(n)
            }
        }

        return results.slice(0, 3)
    }

    async resolveUrls(
        caip2Id: string,
        existingNodes?: Array<{ url: string; providerName: string }>,
    ): Promise<string[]> {
        return (await this.resolveNodes(caip2Id, existingNodes)).map(n => n.url)
    }
}
