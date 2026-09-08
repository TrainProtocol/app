import type { QueryClient } from '@tanstack/react-query'
import { PasskeyCredentialStorage, TrainAuth } from '@train-protocol/auth'
import { HTLCStatus, LockParams, Network, QuoteDetails, SolverLockDetails, Token, TrainSDK } from '@train-protocol/sdk'
import { LoginIdentity } from './hooks/useLoginIdentityMismatch'

export type DerivationMethod = 'passkey' | 'wallet_sign'

export interface LightClientVerifyOptions {
    signal?: AbortSignal
    /** Total budget covering init, sync, and lock observation. */
    timeoutMs?: number
}

/**
 * Trustless verifier for a destination network's solver lock (e.g. a Helios
 * light-client worker). Resolves verified details; resolves null when the lock
 * was not observable within the budget; rejects on infrastructure failure
 * (init/sync/RPC error). Callers treat null and rejection identically — fall
 * back to RPC consensus — the split exists only for logging.
 */
export interface LightClientVerifier {
    /** Begin background init + sync. Idempotent, non-blocking, must never throw. */
    warmUp(): void
    verifySolverLock(params: LockParams, opts?: LightClientVerifyOptions): Promise<SolverLockDetails | null>
}

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
    sdk?: TrainSDK
    /** Optional TrainAuth instance (for testing/multi-instance). Falls back to default. */
    auth?: TrainAuth
    /** Resolve RPC node URLs for a CAIP-2 network ID (used for solver lock verification) */
    resolveNodeUrls?: (networkId: string) => string[]
    /** Resolve a trustless light-client verifier for a CAIP-2 network ID; null when unsupported/unavailable. Tried before RPC consensus. */
    resolveLightClient?: (networkId: string) => LightClientVerifier | null
    /**
     * Only swaps whose source amount is worth at least this many USD verify via
     * the light client; smaller swaps go straight to multi-RPC consensus.
     * A swap that cannot be valued (missing price data) is treated as large.
     * Default 0 — every supported swap uses the light client.
     */
    lightClientMinAmountUsd?: number
    /** Optional TanStack Query client (for sharing with app-level QueryClientProvider) */
    queryClient?: QueryClient
    /** Pre-fetched networks (e.g. from SSR) to seed the cache and avoid a duplicate client-side fetch */
    initialNetworks?: Network[]
    /** Pre-fetched prices to seed the cache */
    initialPrices?: Record<string, number>
    /** Secret derivation options */
    secretDerivation?: {
        /**
         * Persist derivedKey and method to encrypted IndexedDB (default: false).
         * When enabled, the master derived key is encrypted with a non-extractable
         * AES-GCM CryptoKey stored in IndexedDB via the Web Crypto API.
         */
        persist?: boolean
        /** Passkey credential storage */
        passkeyStorage?: PasskeyCredentialStorage
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
    OrderFailed = 'ORDER_FAILED',
    UserLockTransactionFailed = 'USER_LOCK_TRANSACTION_FAILED',
}

/** Persisted swap data */
export interface SwapData {
    requestedAmount: string
    address: string
    source: string
    destination: string
    source_asset: string
    destination_asset: string
    srcContract?: string
    destContract?: string
    receiveAmount?: string
    hashlock?: string
    txId?: string
    refundTxId?: string
    destTxId?: string
    secretRevealed?: boolean
    status?: HTLCStatus
    createdAt?: number
    timelock?: number
    sourceSolverAddress?: string
    destinationSolverAddress?: string
    sourceAddress?: string
    destinationAddress?: string
    srcTokenContract?: string
    destTokenContract?: string
    loginIdentity?: LoginIdentity
}

/** Parameters to start a swap */
export interface StartSwapParams {
    amount: string
    sourceNetwork: string
    destinationNetwork: string
    sourceAsset: Token
    destinationAsset: Token
    sourceAddress: string
    destinationAddress: string
    quote: QuoteDetails
    srcContract: string
    destContract: string
    chainId?: string
}

/** Parameters for quote fetching */
export interface QuoteParams {
    /** Amount to send on source chain (base units). Provide this OR receiveAmount, not both. */
    amount?: string
    /** Amount to receive on destination chain (base units). Provide this OR amount, not both. */
    receiveAmount?: string
    sourceNetwork: string
    destinationNetwork: string
    sourceTokenContract?: string
    destinationTokenContract?: string
    /** Enable auto-refresh (default: true) */
    enabled?: boolean
    /** Refresh interval in ms (default: 42000) */
    refreshInterval?: number
    /** Debounce delay in ms for amount changes (default: 300, set to 0 to disable) */
    debounceMs?: number
}

/** Parameters for swap history */
export interface SwapHistoryParams {
    addresses: string[]
    page?: number
}

/** Parameters for order lookup */
export interface OrderParams {
    hashlock: string
    solverAddress?: string
}
