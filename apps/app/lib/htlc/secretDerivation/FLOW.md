# Secret derivation flow

End-to-end path from UI to HTLC secret/hashlock.

---

## 1. App bootstrap (provider tree)

```
components/WalletProviders/index.tsx
```

- **SecretDerivationProvider** wraps the whole tree (outermost).
- Under it: TonConnect → Solana → **StarknetProvider** → EvmConnectors → Wagmi → … → **WalletProvidersProvider** → app.

So any component under this tree can call `useSecretDerivation()`.

---

## 2. Unified login modal

```
components/SecretDerivation/LoginModal.tsx
```

- **LoginModal** handles the entire login flow in a single modal:
  - pick method → wallet select/connect (EVM only) → signing.
- Method is **not persisted**; login is session-only.

**Where it opens:**

### Primary: First page (FormButton - before "Swap now")
**`components/Swap/FormButton.tsx`** - The main swap form button checks `isLoggedIn`:
- If **not logged in** → shows **"Login to continue"** button.
- Clicking opens **LoginModal**.
- After successful login → **"Swap now"** button appears.

**This enforces that users MUST login before they can swap.**

---

## 3. User triggers "Commit" (HTLC create)

```
components/Swap/AtomicChat/Actions/UserActions.tsx  →  UserCommitAction
```

- User clicks commit.
- `handleCommit()` runs.
- `provider` comes from `useWallet(source_network, 'withdrawal')` (the wallet provider for the source chain).
- It calls:

  ```ts
  provider.createPreHTLC({ address, amount, destinationChain, sourceChain, ... })
  ```

- `provider` is one of the objects returned by `useStarknet` / `useEVM` / `useSVM` / `useTON` / `useFuel` / `useAztec` (see step 4).

---

## 4. Wallet provider → atomic hook → createPreHTLC

Each chain has a "useX" hook that builds the `WalletProvider` and uses an atomic hook:

| Chain   | Wallet hook           | Atomic hook           | File                      |
|--------|------------------------|------------------------|---------------------------|
| Starknet | `useStarknet`         | `useAtomicStarknet`    | `lib/wallets/starknet/useStarknet.ts` → `useAtomicStarknet.ts` |
| EVM    | `useEVM`               | `useAtomicEVM`         | `lib/wallets/evm/useEVM.ts` → `useAtomicEVM.ts` |
| Solana | `useSVM`               | `useAtomicSVM`         | `lib/wallets/solana/useAtomicSVM.ts` |
| TON    | `useTON`               | `useAtomicTON`         | `lib/wallets/ton/useAtomicTON.ts` |
| Fuel   | `useFuel`              | `useAtomicFuel`        | `lib/wallets/fuel/useAtomicFuel.ts` |
| Aztec  | `useAztec`             | `useAtomicAztec`       | `lib/wallets/aztec/useAtomicAztec.ts` |

Example (Starknet):

- `context/walletHookProviders.tsx` → `useStarknet()` → returns `provider` with `createPreHTLC` and other methods.
- `useStarknet` (e.g. `lib/wallets/starknet/useStarknet.ts` line 131) calls `useAtomicStarknet({ starknetWallet, nodeUrl })` and spreads `atomicFunctions` (including `createPreHTLC`) onto `provider`.

So the flow is: **UserActions** → `provider.createPreHTLC(...)` → **atomic hook's** `createPreHTLC` (e.g. `useAtomicStarknet`).

---

## 5. createPreHTLC → deriveSecret (per chain)

In each atomic file, `createPreHTLC`:

1. Calls **useSecretDerivation()** and gets **deriveSecret**.
2. Calls **deriveSecret({ chainId, wallet, timelock })** (timelock from `calculateEpochTimelock(40)` or similar).
3. Builds `secret` buffer and **hashlock = sha256(secret)**.
4. Builds the chain-specific transaction (Starknet call, EVM tx, Solana tx, etc.). **Hashlock is not yet passed to the contract** in many places — see "Note: Add hashlock to args…" in each file.

Files:

- `lib/wallets/starknet/useAtomicStarknet.ts` (around 66)
- `lib/wallets/evm/useAtomicEVM.ts` (around 76)
- `lib/wallets/solana/useAtomicSVM.ts` (around 52)
- `lib/wallets/ton/useAtomicTON.ts` (around 39)
- `lib/wallets/fuel/useAtomicFuel.ts` (around 55)
- `lib/wallets/aztec/useAtomicAztec.ts` (around 38)

---

## 6. deriveSecret implementation (context)

```
context/secretDerivationContext.tsx
```

- **deriveSecret(params)**:
  1. Reads **method** from context (passkey vs wallet_sign).
  2. If no method → throws "No derivation method selected".
  3. **deriveInitialKey(params)**:
     - Returns stored key from login if available.
     - Fallback re-authentication:
       - **passkey** → `deriveKeyWithPasskey()` in `lib/htlc/secretDerivation/passkeyService.ts` (WebAuthn PRF with fixed identity salt).
       - **wallet_sign** → `deriveKeyFromEvmSignature()` (EIP-712 signature with fixed identity salt).
  4. **deriveSecretFromTimelock(initialKey, timelock)** → `lib/htlc/secretDerivation/keyDerivation.ts` (HKDF with timelock salt).
  5. Returns secret as hex string.

**Note:** The initial key derivation uses a fixed identity salt (`train-identity-v1`) rather than chain-specific salts. Secret uniqueness comes from the timelock parameter at commit time.

---

## 7. Core crypto (key derivation)

```
lib/htlc/secretDerivation/
```

- **keyDerivation.ts**
  - `deriveKeyMaterial(ikm, salt)` — HKDF(sha2).
  - `deriveSecretFromTimelock(initialKey, timelock)` — HKDF with timelock salt; returns 32-byte secret.
  - `normalizeHex`, etc.

- **passkeyService.ts**
  - WebAuthn PRF: `deriveKeyWithPasskey()` → 32-byte key using fixed identity salt.
  - `checkPrfSupport()`, `registerPasskey()`, stored credential ID.

- **walletSign/evm.ts**
  - EIP-712 typed data signature → `deriveKeyMaterial(signature, identitySalt)` → 32-byte key.

---

## Flow diagram (summary)

```
[App]
  SecretDerivationProvider
    → FormButton: if not logged in → "Login to continue" (opens LoginModal)
    → User completes login (passkey or EVM wallet) → "Swap now" appears
    → Login derives initialKey using fixed identity salt, stored in context

[User clicks Swap now → goes to page 2]

[User clicks Commit]
  UserActions.handleCommit()
    → provider.createPreHTLC(...)
      → useAtomicEVM / … createPreHTLC()
        → useSecretDerivation().deriveSecret({ timelock, ... })
          → SecretDerivationContext.deriveSecret()
            → deriveInitialKey() → returns stored key from login
            → deriveSecretFromTimelock(initialKey, timelock) → HKDF with timelock
        → secret → sha256 → hashlock
        → build tx with hashlock
```

---

## UI/UX Flow Summary

1. **First page (swap form):** User must click "Login to continue" → LoginModal handles method selection + EVM wallet selection/connection → "Swap now" button appears.
2. **Form submission guard:** When user clicks "Swap now", `handleSubmit` checks `isLoggedIn`:
   - If **not logged in** → Shows error "Please login first" and prevents navigation to page 2.
   - If **logged in** → Proceeds to page 2 (commit/atomic flow).
3. **Second page guard:** `AtomicChat` component checks on mount:
   - If **not logged in** → Automatically redirects back to page 1 with error toast.
   - If **logged in** → Renders the commit page normally.
4. **Commit action:** User clicks "Confirm in wallet" → SignFlowModal shows signing state while the wallet/passkey signature happens.
5. **Method is not persisted**; user logs in each session when needed.

## Security Layers

The implementation has **three layers of protection** to ensure users cannot access page 2 without logging in:

1. **UI Layer:** "Login to continue" button instead of "Swap now" (in `FormButton.tsx`)
2. **Submit Layer:** Form submission validation blocks navigation (in `Atomic/index.tsx` `handleSubmit`)
3. **Page Guard:** Page 2 redirects back if accessed without login (in `AtomicChat/index.tsx`)
