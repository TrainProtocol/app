# Train Protocol - Frontend

## What This App Is
Cross-chain atomic swap platform (Next.js 15 + React 18 + TypeScript). Users swap assets across blockchains using HTLC contracts. Currently EVM is fully implemented; other chains (Solana, Starknet, TON, Fuel, Aztec, ImmutableX, ZKSync) will follow once EVM is end-to-end working.

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
Mapped to code enum (`CommitStatus`):
- `Commit` = Initial (show lock button)
- `Commited` = User locked on source (waiting for solver)
- `SolverLockDetected` = Solver locked on destination (show reveal secret button)
- `SecretRevealed` = User revealed secret via API (waiting for solver claim)
- `RedeemCompleted` = Solver claimed on destination (swap done)
- `TimelockExpired` = Timelock passed without redeem (show refund button)
- `Refunded` = User refunded on source

## Secret & Nonce
- Secret recoverable from nonce: `deriveInitialKey()` + `deriveSecretFromTimelock(key, nonce)`
- Nonce stored in URL query params for page refresh recovery
- `deriveSecret()` returns `{hashlock, nonce}` where nonce = `Date.now()` timestamp

---

## Architecture

### Context (React Context providers)
- `context/atomicContext.tsx` - Central swap state machine (swap status, sourceDetails, solverLockDetails, timelock tracking)
- `context/secretDerivationContext.tsx` - Secret generation and derivation (`deriveSecret` returns `{hashlock, nonce}`)
- `context/settings.tsx` - App settings (networks, routes)

### Models
- `Models/phtlc/PHTLC.ts` - `Commit` type (legacy name, represents a lock), `LockStatus` enum
- `Models/phtlc/index.ts` - `CreatePreHTLCParams`, `CommitmentParams`, `RefundParams`, `ClaimParams`
- `Models/Network.ts` - `Network`, `Token` types

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
- `hooks/htlc/useCommitDetailsPolling.tsx` - Polls source chain until user lock confirmed
- `hooks/htlc/useSolverLockPolling.tsx` - Polls destination chain for solver lock via `getSolverLockDetails`
- `hooks/htlc/useSolverRedeemPolling.tsx` - Polls solver lock for redeem status (LockStatus.Redeemed)
- `hooks/htlc/useRefundStatusPolling.tsx` - Polls source chain for refund status
- `hooks/htlc/useSWRCommitDetails.tsx` - Base SWR hook for user lock polling

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
2. `timelockExpired && !redeemCompleted` -> TimelockExpired
3. `secretRevealed` -> SecretRevealed
4. `solverLockDetails.sender exists` -> SolverLockDetected
5. `sourceDetails.sender exists` -> UserLocked (code: `Commited`)
6. Default -> Initial (code: `Commit`)

### API Integration
- `lib/trainApiClient.ts` - API client
- SWR polling: `${TRAIN_API}/api/${solverName}/swaps/${lockId}` (2s interval)
- `RevealSecret` method: `POST /{solver}/swaps/{lockId}/revealSecret` with `{ secret }`

---

## Common Pitfalls
- Don't check `claimed == 3` - use `status === LockStatus.Redeemed`
- `getDetails` must check sender !== zeroAddress before returning data
- For destination polling use `getSolverLock` (not `getUserLock`)
- `srcAtomicContract` is currently hardcoded for testing - needs to be dynamic before prod
- Non-EVM chains still use old patterns; EVM is the primary focus
- Code uses legacy "commit" naming everywhere (commitId, CommitStatus, etc.) - these all refer to locks now

## Remaining Work
- [ ] Remove hardcoded `srcAtomicContract` - make dynamic
- [ ] End-to-end testing on testnet
- [ ] Handle `quoteExpiry` validation in UI
- [ ] Implement `getSolverLockDetails` for other chains when ready
- [ ] Clean up legacy polling hooks and old ABIs
- [ ] Rename legacy "commit" naming to "lock" across codebase
