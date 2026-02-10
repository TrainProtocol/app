import { SwapQuote } from "@/lib/trainApiClient"
import { Token } from "@/Models/Network"

export const resolveTokenUsdPrice = (token: Token | undefined, quote: SwapQuote | undefined): number | undefined => {
    if (!token) return undefined;

    // Try to get price from quote's route tokens first (more up-to-date)
    if (quote?.route) {
        const sourceToken = quote.route.source.token;
        const destinationToken = quote.route.destination.token;

        if (sourceToken?.symbol === token.symbol && sourceToken.priceInUsd) {
            return sourceToken.priceInUsd;
        }
        if (destinationToken?.symbol === token.symbol && destinationToken.priceInUsd) {
            return destinationToken.priceInUsd;
        }
    }

    // Fall back to token's own priceInUsd
    return token.priceInUsd;
}
