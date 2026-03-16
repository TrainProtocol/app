// --- Providers ---
export { TrainProvider } from './providers/TrainProvider'
export { useStoreContext } from './providers/TrainProvider'
export { SwapProvider } from './providers/SwapProvider'
export type { ResumeSwapParams, SwapContextValue } from './providers/SwapProvider'

// --- Data Hooks (require TrainProvider) ---
export { useNetworks } from './hooks/useNetworks'
export { useNetwork } from './hooks/useNetwork'
export { useTokens } from './hooks/useTokens'
export { usePrices } from './hooks/usePrices'
export { useQuote } from './hooks/useQuote'
export { useSwapHistory } from './hooks/useSwapHistory'
export { useOrder } from './hooks/useOrder'

// --- Swap Data Hooks (require TrainProvider) ---
export { useCurrentSwap, useSwapActions } from './hooks/useCurrentSwap'

// --- Swap Lifecycle Hooks (require SwapProvider) ---
export { useSwap } from './hooks/useSwap'
export { useSwapState } from './hooks/useSwapState'
export { useUserLock } from './hooks/useUserLock'
export { useRevealSecret } from './hooks/useRevealSecret'
export { useRefund } from './hooks/useRefund'
export { useManualClaim } from './hooks/useManualClaim'
export { useRecoverSwap } from './hooks/useRecoverSwap'

// --- Secret Derivation Hooks ---
export { useSecretDerivation } from './hooks/useSecretDerivation'
export { usePasskeyLogin } from './hooks/usePasskeyLogin'
export { useWalletLogin } from './hooks/useWalletLogin'

// --- Wallet Adapter ---
export { useRegisterWallet } from './wallet/useRegisterWallet'
export type { TrainSigner, TrainWalletAdapter } from './wallet/types'

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
    IHTLCClient,
    HTLCFromApi,
    HTLCFromApiResponse,
    SolverQuote,
    SolverProfile,
    QuoteDetails,
    AggregatedQuoteResponse,
    SwapQuote,
    RecoveredSwapData,
    PrfSupportResult,
    DerivationMethod,
} from '@train-protocol/sdk'

export {
    HTLCStatus,
    LockStatus,
    isTerminalStatus,
    TERMINAL_STATUSES,
} from '@train-protocol/sdk'

// --- Hook result types ---
export type { UseQuoteResult } from './hooks/useQuote'
export type { UseSwapResult } from './hooks/useSwap'
export type { UseSwapStateResult } from './hooks/useSwapState'
export type { UseUserLockResult } from './hooks/useUserLock'
export type { UseRevealSecretResult } from './hooks/useRevealSecret'
export type { UseRefundResult } from './hooks/useRefund'
export type { UseManualClaimResult } from './hooks/useManualClaim'
export type { UseRecoverSwapResult } from './hooks/useRecoverSwap'
export type { UseSecretDerivationResult } from './hooks/useSecretDerivation'
export type { UsePasskeyLoginResult } from './hooks/usePasskeyLogin'
export type { UseWalletLoginResult } from './hooks/useWalletLogin'
export type { UseSwapHistoryResult } from './hooks/useSwapHistory'
export type { UseOrderResult } from './hooks/useOrder'
