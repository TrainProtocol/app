# Train Protocol - Frontend

## What This App Is
Cross-chain atomic swap platform (Next.js 15 + React 18 + TypeScript). Users swap assets across blockchains using HTLC contracts. Currently EVM is fully implemented; other chains (Solana, Starknet, TON, Fuel, Aztec) will follow once EVM is end-to-end working.

## App Main Flow
1. **Auth**: User signs in via passkey or EVM wallet. Login securely stores a secret used for generating hashlocks in the HTLC flow.
2. **Route Selection**: User picks source chain/token, destination chain/token, and amount.
3. **Quote**: App fetches quote from API, displays it to user.
4. **Swap**: User clicks "Swap now" -> opens "Complete the swap" modal.
5. **Swap Execution** (4 steps):
   1. User locks funds on source chain (`userLock()`)
   2. Wait for solver to lock on destination chain (poll `getSolverLock`)
   3. User compares solver lock data, clicks "Reveal Secret" (API call to solver)
   4. Wait for solver to claim on destination (swap complete)

## Protocol Docs
Contract reference: https://github.com/TrainProtocol/contracts/blob/main-add-evm/chains/evm/solidity/README.md

---

## EVM Contract Rules (MUST follow)
1. **Single-step lock**: `userLock()` creates lock WITH hashlock in one transaction
2. **hashlock = lockId**: Always present from creation, never null
3. **LockStatus enum**: Pending(0), Redeemed(1), Refunded(2). NO "Completed"(3)
4. **Use `status`, not `claimed`**: `claimed` is legacy
5. **Functions**: `userLock`/`redeemUser`/`refundUser`/`getUserLock` + `solverLock`/`redeemSolver`/`getSolverLock`
6. **Secret reveal**: User reveals secret via API (`RevealSecret`), solver claims on dest then source
7. **Refund**: recipient can refund anytime; others only after timelock
8. **ABI**: `lib/abis/atomic/EVM_HTLC.json` (unified)

## Swap Status Flow
> Note: Code still uses legacy "Commit" naming in enum values and variable names (e.g. `CommitStatus`, `commitId`). These refer to locks, not a separate commit step. The actual flow is lock-based.
```
UserLocked -> SolverLockDetected -> SecretRevealed -> RedeemCompleted
                      -> TimelockExpired -> Refunded
```
Mapped to code enum (`HTLCStatus`):
- `Initial` = show lock button
- `UserLocked` = user locked on source (waiting for solver)
- `SolverLockDetected` = solver locked on destination (show reveal secret button)
- `SecretRevealed` = user revealed secret via API (waiting for solver claim)
- `RedeemCompleted` = solver claimed on destination (swap done)
- `TimelockExpired` = timelock passed without redeem (show refund button)
- `Refunded` = user refunded on source

## Secret & Nonce
- Secret recoverable from nonce (timestamp): `deriveInitialKey()` + `deriveSecretFromTimelock(key, nonce)`
- `deriveSecret()` returns `{hashlock, nonce}` where nonce = `Date.now()` timestamp
- Nonce is stored on-chain in `userData` field of `userLock()` call (ABI-encoded timestamp)
- Also stored in URL query params for page refresh recovery before tx confirms
- `userLock()` accepts `userData` (bytes) and `solverData` (bytes) — we use `userData` for the timestamp

---

## Passkey Login Flow

### UX Flow
1. User clicks **"Passkey"** in login modal
   - If `passkeyCredentialIds` exist in store → use existing passkey (`deriveKeyWithPasskey({ createIfMissing: true })`)
   - If no stored IDs → create new passkey (`registerPasskey(true)`)
2. If passkey operation fails → **PasskeyChoice** recovery screen (adapts to stored state):
   - **Has stored passkeys**: "Try again" (primary) + "Create new passkey" (text link)
   - **No stored passkeys**: "Create new passkey" (primary) + "Log in using existing passkey" (text link — triggers `deriveKeyWithPasskey({ createIfMissing: false })`, browser shows QR/security key cross-device options)
3. Back from recovery screen calls `reset()` to return to pick with clean step history (avoids stale signing entries)

### Key Files
- `lib/htlc/secretDerivation/passkeyService.ts` — WebAuthn API calls (`registerPasskey`, `deriveKeyWithPasskey`, `checkPrfSupport`)
- `context/secretDerivationContext.tsx` — `loginWithPasskey(options?)` dispatches to create vs use-existing
- `components/SecretDerivation/LoginModal/index.tsx` — Login modal step flow (pick → passkey_recovery → wallet_select → signing)
- `components/SecretDerivation/LoginModal/PasskeyChoice.tsx` — Recovery screen with try again / create new / cross-device
- `components/SecretDerivation/LoginModal/OptionSelect.tsx` — Initial Passkey vs Wallet choice
- `stores/secretDerivationStore.ts` — Persists `passkeyCredentialIds`, `activePasskeyCredentialId`, `storedDerivedKey`

### loginWithPasskey Options
| Option | Behavior |
|--------|----------|
| `{ forceCreate: true }` | `registerPasskey(true)` — always creates new passkey |
| `{ crossDevice: true }` | `deriveKeyWithPasskey({ createIfMissing: false })` — existing passkey only |
| `{}` or no options | `deriveKeyWithPasskey({ createIfMissing: true })` — use existing or create if missing |

### PRF (Pseudo-Random Function)
- Passkey PRF output is used as key material for HTLC secret derivation
- PRF support detected via `getClientCapabilities()` (Chrome 132+) with heuristic fallbacks
- During `registerPasskey`, PRF may return key immediately (single-prompt flow) or require a follow-up `credentials.get()`

---

## Architecture

### Context (React Context providers)
- `context/atomicContext.tsx` - Central swap state machine (swap status, sourceDetails, solverLockDetails, timelock tracking)
- `context/secretDerivationContext.tsx` - Secret generation and derivation (`deriveSecret` returns `{hashlock, nonce}`), passkey/wallet login
- `context/settings.tsx` - App settings (networks, routes)

### Models
- `Models/phtlc/PHTLC.ts` - `Commit` type (legacy name, represents a lock), `LockStatus` enum
- `Models/phtlc/index.ts` - `CreatePreHTLCParams`, `CommitmentParams`, `RefundParams`, `ClaimParams`
- `Models/Network.ts` - `Network`, `Token`, `ExplorerUrlTemplate` types

### Wallet Hooks (chain-specific HTLC operations)
Each chain has a `useAtomic*` hook implementing `BaseAtomicFunctions`:
- `lib/wallets/evm/useAtomicEVM.ts` - EVM (v3 contract) - **primary, fully implemented**
- `lib/wallets/solana/useAtomicSVM.ts` - Solana (not yet migrated)
- `lib/wallets/starknet/useAtomicStarknet.ts` - Starknet (not yet migrated)
- `lib/wallets/ton/useAtomicTON.ts` - TON (not yet migrated)
- `lib/wallets/fuel/useAtomicFuel.ts` - Fuel (not yet migrated)
- `lib/wallets/aztec/useAtomicAztec.ts` - Aztec (not yet migrated)

### Shared Wallet Utilities (use these, don't duplicate)
- `lib/wallets/utils/atomicTypes.ts` - All type interfaces (BaseAtomicFunctions, AtomicEVMFunctions with getSolverLockDetails)
- `lib/wallets/utils/atomicHelpers.ts` - `generateRandomId()`, `toHexString()`, `assertWalletConnected()`

### Polling Hooks
- `hooks/htlc/useUserLockPolling.tsx` - Polls source chain until user lock confirmed
- `hooks/htlc/useSolverLockPolling.tsx` - Polls destination chain for solver lock via `getSolverLockDetails`
- `hooks/htlc/useSolverRedeemPolling.tsx` - Polls solver lock for redeem status (LockStatus.Redeemed)
- `hooks/htlc/useRefundStatusPolling.tsx` - Polls source chain for refund status

### UI Components (Swap Flow - Actions)
- `components/Swap/AtomicChat/Actions/index.tsx` - Routes swap status to action component
- `components/Swap/AtomicChat/Actions/UserActions.tsx` - UserLockAction (lock button) + UserRefundAction
- `components/Swap/AtomicChat/Actions/SolverLock.tsx` - "Waiting for solver" (polls solver lock)
- `components/Swap/AtomicChat/Actions/RevealSecret.tsx` - "Reveal Secret" button (re-derives secret, calls API)
- `components/Swap/AtomicChat/Actions/WaitForSolverRedeem.tsx` - "Waiting for solver to claim" (polls redeem)
- `components/Swap/AtomicChat/AtomicContent/Steps/Steps.tsx` - Step visualization

### statusResolver Logic (`context/atomicContext.tsx`)
Priority order (first match wins):
1. `solverLockDetails.status === LockStatus.Redeemed` -> RedeemCompleted
2. `manualClaimRequired` -> ManualClaimRequired
3. `sourceDetails.status === LockStatus.Refunded` -> Refunded
4. `timelockExpired && !redeemCompleted` -> TimelockExpired
5. `secretRevealed || sourceDetails.secret` -> SecretRevealed
6. `solverLockDetails.sender exists && !sourceDetails.secret` -> SolverLockDetected
7. `sourceDetails.sender exists` -> UserLocked
8. Default -> Initial

### Station API Integration
- `lib/trainApiClient.ts` - API client (base: `NEXT_PUBLIC_TRAIN_API/api/v1`)
- **Quote**: SWR polling `GET /quote?amount=&sourceNetwork=&sourceTokenContract=&destinationNetwork=&destinationTokenContract=&includeReward=true`
  - Returns `AggregatedQuoteResponse { quotes: SolverQuote[], errors }` — find `quotes.find(q => q.isBest)`
  - `hooks/useFee.ts` handles polling (42s interval), returns `{ quote, solverId }`
  - Note: in the SSE stream (`/quote/stream`), `isBest` is NOT set on quote events — a separate `best` event carries that. Use the non-streaming `/quote` endpoint for polling.
- **Order status**: SSE stream `GET /orders/{solverId}/{hashlock}/stream`
  - Events: `order` (initial state), `order_event` (webhook-pushed updates), `done` (terminal)
  - `context/atomicContext.tsx` opens `EventSource` when `hashlock` + `solverId` are known
- **Reveal secret**: `POST /orders/{solverId}/{hashlock}/reveal-secret` with `{ secret }`
- **Networks**: `GET /networks` → mapped via `mapStationNetwork()` in `trainApiClient.ts`
  - `slug = caip2Id` (e.g. `"eip155:11155111"`) — Station API routes by caip2Id
  - Token `contract` → `contractAddress`; `nodes` supplemented from local config in `getSettings.ts`
- **`solver` in swapStore** = solverId string (e.g. `"plorex"`), not a wallet address
- `helpers/getSettings.ts` fetches networks live from Station API; merges RPC node URLs from local mock by caip2Id

---

## Common Pitfalls
- Don't check `claimed == 3` - use `status === LockStatus.Redeemed`
- `getDetails` must check sender !== zeroAddress before returning data
- For destination polling use `getSolverLock` (not `getUserLock`)
- `srcAtomicContract` is currently hardcoded for testing - needs to be dynamic before prod
- Non-EVM chains still use old patterns; EVM is the primary focus
- Code uses legacy "commit" naming everywhere (commitId, CommitStatus, etc.) - these all refer to locks now
- `sourceNetwork`/`destinationNetwork` params must be `caip2Id` (e.g. `"eip155:11155111"`), not human slugs

## Remaining Work
- [ ] Remove hardcoded `srcAtomicContract` - make dynamic (use network contracts from chain config)
- [ ] End-to-end testing on testnet
- [ ] Handle `quoteExpiry` validation in UI
- [ ] Implement `getSolverLockDetails` for other chains when ready
- [ ] Clean up legacy polling hooks and old ABIs
- [ ] Rename legacy "commit" naming to "lock" across codebase
- [ ] RPC node URLs (`nodes`) not provided by Station API — needs separate config or user-set RPC
