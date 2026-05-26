export const trainQueryKeys = {
    quote: (params: {
        amount?: string
        receiveAmount?: string
        sourceNetwork: string
        destinationNetwork: string
        sourceTokenContract?: string
        destinationTokenContract?: string
    }) => ['train', 'quote', params] as const,

    networks: () => ['train', 'networks'] as const,

    prices: () => ['train', 'prices'] as const,

    swapHistory: (addresses: string[], page: number) =>
        ['train', 'swapHistory', { addresses, page }] as const,

    order: (hashlock: string, solverAddress?: string) =>
        ['train', 'order', { hashlock, solverAddress }] as const,

    userLock: (hashlock: string) =>
        ['train', 'userLock', hashlock] as const,

    solverLock: (hashlock: string) =>
        ['train', 'solverLock', hashlock] as const,
}
