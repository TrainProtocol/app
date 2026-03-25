import type { Token, Network } from '@train-protocol/sdk'
import type { SwapData } from '../types'

/**
 * Resolves sourceAsset / destinationAsset Token objects from networks data
 * using the persisted swap's CAIP-2 network IDs and asset symbol strings.
 */
export function resolveSwapTokens(
    swapData: SwapData | undefined,
    networks: Network[],
): { sourceAsset: Token | null; destinationAsset: Token | null } {
    if (!swapData) return { sourceAsset: null, destinationAsset: null }

    let sourceAsset: Token | null = null
    let destinationAsset: Token | null = null

    if (swapData.source && swapData.source_asset) {
        const network = networks.find(n => n.caip2Id.toUpperCase() === swapData.source.toUpperCase())
        sourceAsset = network?.tokens.find(t => t.symbol === swapData.source_asset) ?? null
    }

    if (swapData.destination && swapData.destination_asset) {
        const network = networks.find(n => n.caip2Id.toUpperCase() === swapData.destination.toUpperCase())
        destinationAsset = network?.tokens.find(t => t.symbol === swapData.destination_asset) ?? null
    }

    return { sourceAsset, destinationAsset }
}
