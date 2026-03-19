# @train-protocol/react

React hooks and providers for integrating Train Protocol cross-chain atomic swaps. Wraps `@train-protocol/sdk` with React-idiomatic state management, polling, and wallet integration. No UI components — purely logic, types, and state.

## Setup

```tsx
import { TrainProvider, SwapProvider } from '@train-protocol/react'

function App() {
  return (
    <TrainProvider config={{ baseUrl: 'https://api.train.protocol' }}>
      <SwapProvider>
        <YourSwapUI />
      </SwapProvider>
    </TrainProvider>
  )
}
```

## Provider Hierarchy

```
TrainProvider (API client, Zustand store, wallet registry, networks/prices)
  └── SwapProvider (swap state machine, polling, lifecycle actions)
```

- **TrainProvider** — required root provider. Initializes `TrainApiClient`, creates persistent swap store, manages wallet adapter registry, fetches networks and prices.
- **SwapProvider** — manages active swap lifecycle (lock, poll, reveal, redeem/refund). Wrap around components that need swap actions.

## Exports

### Data Hooks (require TrainProvider)

| Hook | Description |
| --- | --- |
| `useNetworks()` | Fetch supported networks — `{ networks, isLoading, error, refetch }` |
| `useNetwork(caip2Id)` | Look up a single network by CAIP-2 ID |
| `useTokens(networkId)` | Get tokens for a network |
| `usePrices()` | Fetch token prices — `{ prices, isLoading, refetch }` |
| `useQuote(params)` | Stream quotes from solvers (debounced, auto-refresh) — `{ quotes, bestQuote, bestSolver, isLoading }` |
| `useSwapHistory(params)` | Fetch historical swaps by addresses |
| `useOrder(params)` | Fetch single order by solverId + hashlock |

### Swap Data Hooks (require TrainProvider)

| Hook | Description |
| --- | --- |
| `useCurrentSwap()` | Read current/active swap data from store — `SwapData \| null` |
| `useSwapActions()` | Manipulate swap store — `{ setCurrentSwap, clearCurrentSwap, setActiveHashlock, commitSwap, updateSwap }` |

### Swap Lifecycle Hooks (require SwapProvider)

| Hook | Description |
| --- | --- |
| `useSwap()` | Full swap context — status + all action methods (`startSwap`, `resumeSwap`, `revealSecret`, `refund`, `manualClaim`, `recoverSwap`) |
| `useSwapState()` | Read-only swap state — `{ status, hashlock, sourceDetails, solverLockDetails, secretRevealed, isTimelockExpired }` |
| `useUserLock()` | Initiate user lock — `{ lock, isLocking, error }` |
| `useRevealSecret()` | Reveal secret to solver — `{ reveal, isRevealing, error }` |
| `useRefund()` | Refund on source after timelock — `{ refund, isRefunding, canRefund, error }` |
| `useManualClaim()` | Emergency claim on destination — `{ claim, isClaiming, canClaim, error }` |
| `useRecoverSwap()` | Recover swap from transaction hash — `{ recover, isRecovering, error }` |

### Secret & Authentication Hooks

| Hook | Description |
| --- | --- |
| `useSecretDerivation()` | Passkey or wallet-based key derivation — `{ method, isLoggedIn, derivedKey, loginWithPasskey, loginWithWallet, logout, deriveSecret }` |
| `usePasskeyLogin()` | Passkey-only auth — `{ login, register, isSupported, checkSupport }` |
| `useWalletLogin()` | Wallet signature-based derivation — `{ login(providerName, config) }` |

### Wallet Integration

| Hook | Description |
| --- | --- |
| `useRegisterWallet(adapter)` | Register a chain-specific wallet adapter (auto-unregisters on unmount) |

Consumers create a `TrainWalletAdapter` that bridges their wallet library (wagmi, solana-wallet-adapter, etc.):

```ts
interface TrainWalletAdapter {
  chainNamespace: string          // 'eip155', 'solana', 'starknet', 'aztec'
  getSigner(): TrainSigner | null
  getClientConfig?(): Record<string, unknown>  // rpcUrl, chainId, etc.
}

interface TrainSigner {
  address: string
  chainNamespace: string
  sendTransaction(tx: { to, data, value? }): Promise<string>
}
```

### Types & Errors

| Export | Description |
| --- | --- |
| `TrainConfig` | Provider config: `{ baseUrl, persistSwaps?, storage?, onError? }` |
| `SwapData` | Persisted swap record (amounts, addresses, assets, status, hashlock, txIds) |
| `StartSwapParams` | Parameters for initiating a swap |
| `QuoteParams` | Parameters for quote streaming |
| `TrainError` / `TrainErrorCode` | Typed error class with codes: `ApiError`, `LockFailed`, `RevealFailed`, `WalletNotConnected`, etc. |

Re-exports from SDK: `Network`, `Token`, `LockDetails`, `HTLCStatus`, `LockStatus`, `IHTLCClient`, `HTLCFromApi`, `SolverQuote`, `QuoteDetails`, and more.

## State Management

- **Zustand store** (persistent) — stores swap history, active hashlock, current swap data. Persists to `train:swaps` localStorage key. Custom `SwapStorage` adapter supported.
- **React reducer** (in SwapProvider) — manages active swap lifecycle state machine.
- **Polling** — 3-second intervals for source lock status (`useUserLockPolling`) and solver lock detection (`useSolverLockPolling`). Auto-stops when terminal conditions met.
- **SSE streaming** — order event stream for real-time transaction updates.

## Swap Lifecycle

1. Call `startSwap(params, derivedKey)` — locks funds on source chain
2. SwapProvider polls for solver lock on destination chain
3. Solver lock detected and verified — `revealSecret()` called automatically or manually
4. Solver redeems on both chains — status becomes `RedeemCompleted`
5. If timelock expires before completion — `refund()` becomes available
6. `manualClaim(secret)` available as fallback 3 minutes after source redeemed but destination not
