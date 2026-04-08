// --- Providers ---
export { TrainProvider } from './providers/TrainProvider'

// --- Data Hooks (require TrainProvider) ---
export { useNetworks } from './hooks/useNetworks'
export { useNetwork } from './hooks/useNetwork'
export { useTokens } from './hooks/useTokens'
export { usePrices } from './hooks/usePrices'
export { useQuote } from './hooks/useQuote'
export { useOrder } from './hooks/useOrder'

// --- Swap Hooks (require TrainProvider) ---
// Read
export { useSwap } from './hooks/useSwap'
export { useSwaps } from './hooks/useSwaps'
// Lifecycle
export { useSwapProgress } from './hooks/useSwapProgress'
export { useSwapState } from './hooks/useSwapState'
export { useCreateSwap } from './hooks/useCreateSwap'
export { useRecoverSwap } from './hooks/useRecoverSwap'
// Actions (take hashlock)
export { useRevealSecret } from './hooks/useRevealSecret'
export { useRefund } from './hooks/useRefund'
export { useManualClaim } from './hooks/useManualClaim'
export { useSolverLockVerification } from './hooks/useSolverLockVerification'
export { useClearSwapError } from './hooks/useClearSwapError'
export { useUpdateSwap } from './hooks/useUpdateSwap'

// --- Secret Derivation ---
export { SecretDerivationProvider, useSharedSecretDerivation, useOptionalSecretDerivation } from './providers/SecretDerivationProvider'
export type { SecretDerivationProviderProps, SecretDerivationContextValue, LoginWalletInfo } from './providers/SecretDerivationProvider'
export { useSecretDerivation } from './hooks/useSecretDerivation'
export { usePasskeyLogin } from './hooks/usePasskeyLogin'
export { useWalletLogin } from './hooks/useWalletLogin'
export { useLoginIdentityMismatch } from './hooks/useLoginIdentityMismatch'

// --- Wallet Adapter ---
export { useRegisterWallet } from './wallet/useRegisterWallet'
export type { TrainSigner, TrainWalletAdapter } from './wallet/types'

// --- Branded Types (chain identifiers) ---
export type { Caip2Id, ChainNamespace, ChainReference } from './internal/branded'
export { caip2Id, chainNamespace, chainReference, parseCaip2Id } from './internal/branded'

// --- Swap Store Types ---
export type { SwapFlags, ConsensusPhase } from './internal/store'

// --- Query Keys (for advanced consumers: prefetch/invalidate) ---
export { trainQueryKeys } from './internal/queryKeys'

// --- Types ---
export {
    TrainError,
    TrainErrorCode,
} from './types'

export type {
    TrainConfig,
    SwapStorage,
    SwapData,
    StartSwapParams,
    QuoteParams,
    SwapHistoryParams,
    OrderParams,
} from './types'

// --- Re-exported SDK types ---
export type {
    Network,
    Token,
    LockDetails,
    UserLockDetails,
    SolverLockDetails,
    IHTLCReadClient,
    IHTLCClient,
    HTLCFromApi,
    HTLCFromApiResponse,
    SolverQuote,
    SolverProfile,
    QuoteDetails,
    AggregatedQuoteResponse,
    SwapQuote,
    RecoveredSwapData,
    VerificationResult,
} from '@train-protocol/sdk'

export {
    HTLCStatus,
    LockStatus,
    HTLCTransaction,
    isTerminalStatus,
    TERMINAL_STATUSES,
} from '@train-protocol/sdk'

// --- Re-exported Auth types ---
export type {
    PrfSupportResult,
    PasskeyCredentialStorage,
} from '@train-protocol/auth'

export {
    InMemoryPasskeyStorage,
} from '@train-protocol/auth'

export { IndexedDBPasskeyStorage } from './internal/IndexedDBPasskeyStorage'
export { SecureStorage } from './internal/SecureStorage'

export type { DerivationMethod } from './types'

// --- Derived state type ---
export type { DerivedSwapState } from './internal/useDerivedSwapState'

// --- Hook result types ---
export type { UseQuoteResult } from './hooks/useQuote'
export type { UseCreateSwapResult } from './hooks/useCreateSwap'
export type { UseRevealSecretResult } from './hooks/useRevealSecret'
export type { UseRefundResult, RefundParams } from './hooks/useRefund'
export type { UseManualClaimResult, ManualClaimParams } from './hooks/useManualClaim'
export type { UseSolverLockVerificationResult } from './hooks/useSolverLockVerification'
export type { UseRecoverSwapResult } from './hooks/useRecoverSwap'
export type { UseSecretDerivationResult, PasskeyLoginOptions } from './hooks/useSecretDerivation'
export type { UsePasskeyLoginResult } from './hooks/usePasskeyLogin'
export type { UseWalletLoginResult } from './hooks/useWalletLogin'
export type { LoginIdentity, IdentityWarning, IdentityMismatchResult, LoginIdentityState } from './hooks/useLoginIdentityMismatch'
export type { UseOrderResult } from './hooks/useOrder'
