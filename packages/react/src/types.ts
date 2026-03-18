import type { TrainApiClient } from '@train-protocol/sdk'

export type DerivationMethod = 'passkey' | 'wallet_sign'

// Re-export key SDK types for consumer convenience
export type {
    Network,
    Token,
    LockDetails,
    UserLockDetails,
    SolverLockDetails,
    LockStatus,
    HTLCStatus,
    IHTLCClient,
    UserLockParams,
    LockParams,
    RefundParams,
    RedeemSolverParams,
    AtomicResult,
    RecoveredSwapData,
    HTLCFromApi,
    HTLCFromApiResponse,
    SolverQuote,
    SolverProfile,
    QuoteDetails,
    AggregatedQuoteResponse,
    SwapQuote,
    OrderStreamEvent,
    TransactionCreatedEventData,
    StatusChangedEventData,
    StatusResolverInput,
    VerificationResult,
    VerifySolverLockParams,
} from '@train-protocol/sdk'

// Re-export auth types
export type {
    PrfSupportResult,
    PasskeyCredentialStorage,
} from '@train-protocol/auth'

/** Configuration for TrainProvider */
export interface TrainConfig {
    /** Station API base URL (required) */
    baseUrl: string
    /** Enable localStorage persistence for swaps (default: true) */
    persistSwaps?: boolean
    /** Custom storage adapter for non-browser environments */
    storage?: SwapStorage
    /** Global error callback */
    onError?: (error: TrainError) => void
    /** Optional TrainSDK instance (for testing/multi-instance). Falls back to default. */
    sdk?: import('@train-protocol/sdk').TrainSDK
    /** Optional TrainAuth instance (for testing/multi-instance). Falls back to default. */
    auth?: import('@train-protocol/auth').TrainAuth
    /** Resolve RPC node URLs for a CAIP-2 network ID (used for solver lock verification) */
    resolveNodeUrls?: (networkId: string) => string[]
    /** Secret derivation options */
    secretDerivation?: {
        /** Persist derivedKey and method to localStorage (default: true) */
        persist?: boolean
        /** localStorage key prefix (default: 'train:auth') */
        persistKey?: string
        /** Passkey credential storage */
        passkeyStorage?: import('@train-protocol/auth').PasskeyCredentialStorage
        /** Auto-check passkey support on mount (default: true) */
        autoCheckPasskeySupport?: boolean
    }
}

/** Custom storage adapter interface */
export interface SwapStorage {
    getItem(key: string): string | null | Promise<string | null>
    setItem(key: string, value: string): void | Promise<void>
    removeItem(key: string): void | Promise<void>
}

/** Train-specific error with code */
export class TrainError extends Error {
    constructor(
        message: string,
        public code: TrainErrorCode,
        public cause?: unknown,
    ) {
        super(message)
        this.name = 'TrainError'
    }
}

export enum TrainErrorCode {
    ApiError = 'API_ERROR',
    NetworkError = 'NETWORK_ERROR',
    WalletNotConnected = 'WALLET_NOT_CONNECTED',
    NoAdapterRegistered = 'NO_ADAPTER_REGISTERED',
    LockFailed = 'LOCK_FAILED',
    RevealFailed = 'REVEAL_FAILED',
    RefundFailed = 'REFUND_FAILED',
    ClaimFailed = 'CLAIM_FAILED',
    RecoverFailed = 'RECOVER_FAILED',
    VerificationFailed = 'VERIFICATION_FAILED',
    TimelockExpired = 'TIMELOCK_EXPIRED',
    SecretDerivationFailed = 'SECRET_DERIVATION_FAILED',
}

/** Persisted swap data */
export interface SwapData {
    requestedAmount: string
    address: string
    source: string
    destination: string
    source_asset: string
    destination_asset: string
    solver?: string
    srcContract?: string
    destContract?: string
    receiveAmount?: string
    hashlock?: string
    txId?: string
    refundTxId?: string
    destTxId?: string
    secretRevealed?: boolean
    status?: import('@train-protocol/sdk').HTLCStatus
    createdAt?: number
    timelock?: number
    sourceSolverAddress?: string
    destinationSolverAddress?: string
}

/** Parameters to start a swap */
export interface StartSwapParams {
    amount: string
    sourceNetwork: string
    destinationNetwork: string
    sourceAsset: import('@train-protocol/sdk').Token
    destinationAsset: string
    sourceAddress: string
    destinationAddress: string
    solverId: string
    quote: import('@train-protocol/sdk').QuoteDetails
    srcContract: string
    destContract: string
    tokenContractAddress?: string
    chainId?: string
}

/** Parameters for quote fetching */
export interface QuoteParams {
    amount: string
    sourceNetwork: string
    destinationNetwork: string
    sourceTokenContract?: string
    destinationTokenContract?: string
    /** Enable auto-refresh (default: true) */
    enabled?: boolean
    /** Refresh interval in ms (default: 42000) */
    refreshInterval?: number
}

/** Parameters for swap history */
export interface SwapHistoryParams {
    addresses: string[]
    page?: number
}

/** Parameters for order lookup */
export interface OrderParams {
    solverId: string
    hashlock: string
}
