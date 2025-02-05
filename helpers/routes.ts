import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues"

export const resolveNetworkRoutesURL = (direction: SwapDirection, values: SwapFormValues) => {

    const { from, to, fromCurrency, toCurrency } = values

    const selectednetwork = direction === "from" ? to : from
    const selectedToken = direction === "from" ? toCurrency?.symbol : fromCurrency?.symbol
    return resolveRoutesURLForSelectedToken({ direction, network: selectednetwork?.name, token: selectedToken, includes: { unmatched: true, unavailable: true } })
}

export const resolveRoutesURLForSelectedToken = ({ direction, network, token, includes }: { direction: SwapDirection, network: string | undefined, token: string | undefined, includes: { unavailable: boolean, unmatched: boolean } }) => {

    const include_unmatched = includes.unmatched ? 'true' : 'false'
    const include_swaps = 'true'
    const include_unavailable = includes.unavailable ? 'true' : 'false'

    const params = new URLSearchParams({
        // include_unmatched,
        // include_swaps,
        // include_unavailable,
        ...(network ?
            {
                [direction === 'to' ? 'source_network' : 'destination_network']: network,
            }
            : {}
        ),
        ...(network && token ?
            {
                [direction === 'to' ? 'source_network' : 'destination_network']: network,
            }
            : {}
        ),
        ...(token ?
            {
                [direction === 'to' ? 'source_token' : 'destination_token']: token,
            }
            : {}
        )
    });

    const sourceRoutesURL = `/sources?${params.toString()}`
    const destinationRoutesURL = `/destinations?${params.toString()}`
    const result = direction === "from" ? sourceRoutesURL : destinationRoutesURL

    return result

}