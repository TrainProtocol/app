import type { Token, Network } from '@train-protocol/sdk'
import type { SwapData } from '../types'

function resolveToken(
    networkMap: Map<string, Network>,
    networkCaip2: string,
    assetRef: string,
): Token | null {
    const network = networkMap.get(networkCaip2.toUpperCase())
    if (!network) return null

    // Match by symbol (primary), fall back to contract address (legacy recovered swaps)
    return network.tokens.find(t => t.symbol === assetRef)
        ?? network.tokens.find(t => t.contract?.toLowerCase() === assetRef.toLowerCase())
        ?? null
}

/**
 * Resolves sourceAsset / destinationAsset Token objects from networks data
 * using the persisted swap's CAIP-2 network IDs and token symbols.
 *
 * Uses the pre-built networkMap for O(1) lookups instead of scanning the array.
 */
export function resolveSwapTokens(
    swapData: SwapData | undefined,
    networkMap: Map<string, Network>,
): { sourceAsset: Token | null; destinationAsset: Token | null } {
    if (!swapData) return { sourceAsset: null, destinationAsset: null }

    const sourceAsset = (swapData.source && swapData.source_asset)
        ? resolveToken(networkMap, swapData.source, swapData.source_asset)
        : null

    const destinationAsset = (swapData.destination && swapData.destination_asset)
        ? resolveToken(networkMap, swapData.destination, swapData.destination_asset)
        : null

    return { sourceAsset, destinationAsset }
}
