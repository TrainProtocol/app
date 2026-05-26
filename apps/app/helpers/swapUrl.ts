const SWAP_PARAMS = { sourceNetwork: 'sourceNetwork', txHash: 'txHash' } as const

export function buildSwapQuery(sourceNetwork: string, txHash: string) {
    return { [SWAP_PARAMS.sourceNetwork]: sourceNetwork, [SWAP_PARAMS.txHash]: txHash }
}

export function parseSwapQuery(searchParams: URLSearchParams | null | undefined) {
    return {
        sourceNetwork: searchParams?.get(SWAP_PARAMS.sourceNetwork) ?? undefined,
        txHash: searchParams?.get(SWAP_PARAMS.txHash) ?? undefined,
    }
}
