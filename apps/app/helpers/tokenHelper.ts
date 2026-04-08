import { ExtendedToken, Token } from "@/Models/Network"

/**
 * Resolves token USD price from token object
 * The new quote API no longer provides prices, so we rely on token.priceInUsd from Network data
 */
export const resolveTokenUsdPrice = (token: ExtendedToken | undefined): number | undefined => {
    return token?.priceInUsd;
}
