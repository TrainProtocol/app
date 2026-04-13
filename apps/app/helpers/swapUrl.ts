import type { ParsedUrlQuery } from 'querystring'

/** Canonical query-param keys for identifying an active swap in the URL */
const SWAP_PARAMS = { sourceNetwork: 'sourceNetwork', txHash: 'txHash' } as const

/** Build the query object for a swap URL (for URLSearchParams or router.push) */
export function buildSwapQuery(sourceNetwork: string, txHash: string) {
    return { [SWAP_PARAMS.sourceNetwork]: sourceNetwork, [SWAP_PARAMS.txHash]: txHash }
}

/** Extract swap params from a Next.js router query */
export function parseSwapQuery(query: ParsedUrlQuery) {
    return {
        sourceNetwork: query[SWAP_PARAMS.sourceNetwork] as string | undefined,
        txHash: query[SWAP_PARAMS.txHash] as string | undefined,
    }
}
