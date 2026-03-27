import type { Token, Network } from '@train-protocol/sdk'
import type { SwapData } from '../types'

function resolveToken(
    networks: Network[],
    networkCaip2: string,
    assetRef: string,
): Token | null {
    const network = networks.find(
        n => n.caip2Id.toUpperCase() === networkCaip2.toUpperCase()
    )
    if (!network) return null

    // Match by symbol (primary), fall back to contract address (legacy recovered swaps)
    return network.tokens.find(t => t.symbol === assetRef)
        ?? network.tokens.find(t => t.contractAddress?.toLowerCase() === assetRef.toLowerCase())
        ?? null
}

/**
 * Resolves sourceAsset / destinationAsset Token objects from networks data
 * using the persisted swap's CAIP-2 network IDs and token symbols.
 */
export function resolveSwapTokens(
    swapData: SwapData | undefined,
    networks: Network[],
): { sourceAsset: Token | null; destinationAsset: Token | null } {
    if (!swapData) return { sourceAsset: null, destinationAsset: null }

    const sourceAsset = (swapData.source && swapData.source_asset)
        ? resolveToken(networks, swapData.source, swapData.source_asset)
        : null

    const destinationAsset = (swapData.destination && swapData.destination_asset)
        ? resolveToken(networks, swapData.destination, swapData.destination_asset)
        : null

    return { sourceAsset, destinationAsset }
}
