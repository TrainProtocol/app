export type RevealSecretParams = {
    secret: string
}

export type HTLCFromApiResponse = {
    order: HTLCFromApi;
    solver: SolverProfile;
}

export type HTLCFromApi = {
    hashlock: string,
    sourceAmount: number,
    sourceAmountInUsd: number,
    sourceAddress: string,
    destinationAmount: number,
    destinationAmountInUsd: number,
    destinationAddress: string,
    feeAmount: number,
    sourceContractAddress: string,
    destinationContractAddress: string,
    sourceWallet: {
        address: string,
        name: string,
        networkType: string,
    }
    destinationWallet: {
        address: string,
        name: string,
        networkType: string,
    }
    destination: {
        network: {
            chainId: string,
            displayName: string,
            feePercentageIncrease: number,
            feeType: string,
            htlcNativeContractAddress: string,
            htlcTokenContractAddress: string,
            name: string,
            type: string,
            nativeToken: {
                contract: string,
                decimals: number,
                symbol: string
            }
        },
        token: {
            symbol: string,
            contract: string,
            decimals: number
        },
    },
    transactions: {
        type: HTLCTransaction,
        hash: string,
        network: string
    }[],
    error?: {
        message: string;
    }
}

export enum HTLCTransaction {
    HTLCLock = 'HTLCLock',
    HTLCRedeem = 'HTLCRedeem',
}

export type SolverProfile = {
    id: string;
    name: string;
    description?: string;
    logoUrl?: string;
}

export type SolverQuote = {
    solver: SolverProfile;
    isBest: boolean;
    quote?: QuoteDetails;
    quoteWithoutReward?: QuoteDetails;
}

type QuoteRouteEndpoint = {
    networkSlug: string;
    tokenSymbol: string;
    tokenContract: string;
    tokenDecimals: number;
}

type QuoteRoute = {
    source: QuoteRouteEndpoint;
    destination: QuoteRouteEndpoint;
    minAmountInSource: string;
    maxAmountInSource: string;
}

export type QuoteDetails = {
    signature: string;
    totalFee: string;
    receiveAmount: string;
    sourceSolverAddress: string;
    destinationSolverAddress: string;
    quoteExpirationTimestampInSeconds: number;
    route: QuoteRoute;
    timelock: {
        timelockTimeSpanInSeconds: number;
    };
    reward: {
        amount: string;
        rewardTimelockTimeSpanInSeconds: number;
        rewardToken: string;
        rewardRecipientAddress: string;
    };
}

export type AggregatedQuoteResponse = {
    quotes: SolverQuote[];
    errors: { solverId: string; message: string }[];
}

export type SwapQuoteResponse = {
    error?: { message: string };
    data?: AggregatedQuoteResponse;
}

/** Resolved best quote */
export type SwapQuote = QuoteDetails;


export type OrderStreamEvent = {
    eventType: 'order.created' | 'order.transaction_created' | 'order.status_changed'
    data: OrderCreatedEventData | TransactionCreatedEventData | StatusChangedEventData
}

export type OrderCreatedEventData = {
    hashlock: string
    routeId: number
    sourceAddress: string
    destinationAddress: string
    sourceAmount: string
    destinationAmount: string
}

export type TransactionCreatedEventData = {
    hashlock: string
    network: string
    transactionType: string
    transactionHash: string
}

export type StatusChangedEventData = {
    hashlock: string
    status: string
    failureReason: string | null
}