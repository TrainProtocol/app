---
paths:
  - "packages/blockchains/**"
---

# Chain SDK Integration Rules

Rules and patterns for adding new blockchain HTLC client SDKs. Derived from `evm`, `starknet`, `solana`, `ton`, `aztec`, and `fuel` implementations.

---

## 1. Package Structure

```
packages/blockchains/{chain}/
├── src/
│   ├── client.ts           # Main HTLC client class
│   ├── resolveLock.ts      # Lock resolution logic (pure functions, exported)
│   ├── index.ts            # Registration + public exports
│   ├── types.ts            # Signer interface + client config type
│   ├── constants.ts        # Chain-specific constants (ZERO_ADDRESS, etc.)
│   ├── login/
│   │   ├── index.ts        # Re-exports from wallet-sign.ts
│   │   └── wallet-sign.ts  # Key derivation for this chain's wallet
│   ├── abis/ or artifacts/ # Contract ABI/artifacts (chain-specific format)
│   └── __tests__/
│       └── resolveLock.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

Additional utility files (`rpc.ts`, `utils.ts`) are allowed when the chain needs custom RPC or helper logic.

---

## 2. package.json

```jsonc
{
  "name": "@train-protocol/{chain}",
  "version": "0.1.0",
  "description": "Train Protocol SDK — {Chain} HTLC client",
  "type": "module",
  "main": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "default": "./dist/esm/index.js"
    }
  },
  "sideEffects": false,
  "files": ["dist", "dist/**/*"],
  "scripts": {
    "build": "pnpm clean && pnpm build:esm+types",
    "build:esm+types": "tsc --project tsconfig.json --rootDir ./src --outDir ./dist/esm --declaration --declarationMap --declarationDir ./dist/types",
    "clean": "rimraf dist tsconfig.tsbuildinfo",
    "dev": "tsc ... --watch",
    "check:types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    // chain-specific libraries only
  },
  "peerDependencies": {
    "@train-protocol/sdk": "workspace:^"
  },
  "devDependencies": {
    "@train-protocol/sdk": "workspace:^",
    "@types/node": "^20",
    "rimraf": "^6.0.1",
    "typescript": "catalog:",
    "vitest": "^4.0.18"
  },
  "engines": { "node": ">=18" }
}
```

Chain-specific libraries go in `dependencies`. The base SDK is always a `peerDependency`.

---

## 3. types.ts — Signer, Config & Registry Augmentation

Every SDK defines a **Signer** interface, a **Config** type, a **WalletSignConfig** type, and augments the SDK registry maps via declaration merging:

```ts
import type { BaseHTLCClientConfig } from '@train-protocol/sdk'
import type { {Chain}WalletLike } from './login/index.js'

// Augment the SDK registry so the factory callbacks are fully typed.
// This eliminates all `as` casts in index.ts.
declare module '@train-protocol/sdk' {
    interface HTLCClientConfigMap {
        {namespace}: {Chain}HTLCClientConfig
    }
    interface WalletSignConfigMap {
        {namespace}: {Chain}WalletSignConfig
    }
}

// Config passed to deriveKeyFromWallet('{namespace}', config).
export type {Chain}WalletSignConfig = {
    wallet: {Chain}WalletLike
    // Add address / options if the chain's key derivation needs them.
}

// Signer wraps the chain's wallet/signing mechanism.
// Must expose the address and a way to send transactions.
export interface {Chain}Signer {
    address: string
    // Chain-specific signing method(s)
}

// Config extends BaseHTLCClientConfig (which provides apiClient).
// Always includes rpcUrl and optional signer.
export type {Chain}HTLCClientConfig = BaseHTLCClientConfig & {
    rpcUrl: string
    signer?: {Chain}Signer
}
```

---

## 4. client.ts — Class Structure & Function Ordering

### Class skeleton

```ts
import { HTLCClient } from '@train-protocol/sdk'
import { resolveLock } from './resolveLock.js'

export class {Chain}HTLCClient extends HTLCClient {
    private rpc: ...             // RPC/node client for read operations
    private signer?: {Chain}Signer

    constructor(config: {Chain}HTLCClientConfig) {
        super(config.apiClient)  // Always pass apiClient to base
        this.rpc = ...
        this.signer = config.signer
        // Override default consensus options if needed (e.g., Aztec: minQuorum 1)
        // this.consensusOptions = { minQuorum: 1 }
    }

    // ── Write Operations ───────────────────────────────────────────────

    async userLock(params: UserLockParams): Promise<AtomicResult> { ... }
    async refund(params: RefundParams): Promise<string> { ... }
    async redeemSolver(params: RedeemSolverParams): Promise<string> { ... }

    // ── Read Operations ────────────────────────────────────────────────

    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<LockDetails | null> { ... }
    async getUserLockDetails(params: LockParams): Promise<LockDetails | null> { ... }
    async recoverSwap(txHash: string): Promise<RecoveredSwapData> { ... }

    // ── Public Helpers ─────────────────────────────────────────────────

    async getTransaction(txHash: string): Promise<TransactionInfo | null> { ... }

    // ── Private Helpers ────────────────────────────────────────────────

    private requireSigner(): {Chain}Signer { ... }
    // ... chain-specific helpers (but NOT resolveLock — see resolveLock.ts)
}
```

**Important:** Lock resolution logic (`resolveLock`, `parseSecret`, `mapLockStatus`, etc.) must be in `resolveLock.ts` as exported pure functions, NOT as private methods on the client class. The client imports and calls them. This keeps the logic independently testable without mocking RPC.

### Ordering rules

1. **Write operations first** — `userLock` → `refund` → `redeemSolver`
2. **Read operations second** — `getUserLockDetails` → `getSolverLockDetails` → `recoverSwap`
3. **Public helpers third** — `getTransaction`
4. **Private helpers last** — `requireSigner()` first, then chain-specific utilities
5. **Use section comments** — `// ── Write Operations ───...` / `// ── Public Helpers ───...` separator style between groups

### Base class methods (do NOT override)

The base `HTLCClient` class provides these methods — subclasses should **not** override them:

- `revealSecret(solverId, hashlock, secret)` — delegates to `apiClient.revealSecret()`
- `getSolverLockDetailsWithConsensus(params, nodeUrls, options?)` — queries multiple nodes via `getSolverLockDetails`, validates results match across nodes (see below)

### Cross-node consensus

The base class provides `getSolverLockDetailsWithConsensus()` which fans out `getSolverLockDetails()` to multiple RPC nodes and validates that all successful responses agree on critical fields (`amount`, `sender`, `recipient`, `token`, `timelock`).

**Consensus options:**
- The base class sets `protected consensusOptions: ConsensusOptions = { minQuorum: 2 }` by default
- Subclasses can override this in their constructor (e.g., Aztec sets `minQuorum: 1` since it typically has fewer public nodes)
- Per-call `options` passed to `getSolverLockDetailsWithConsensus()` take priority over the instance default

**How it works:**
1. Queries all `nodeUrls` in parallel via `Promise.allSettled`
2. Filters for non-null results
3. Requires at least `minQuorum` agreeing results (capped to `nodeUrls.length`)
4. Compares critical fields across all valid results — throws if they disagree
5. Returns the first valid result if consensus passes

Chain implementations only need to implement the single-node abstract method `getSolverLockDetails(params, nodeUrl)`.

---

## 5. Write Operation Patterns

### userLock

1. Call `this.requireSigner()`
2. Destructure params
3. Parse amount with `parseUnits(amount.toString(), decimals)`
4. Handle token approval/authorization if needed (ERC20 allowance, authwit, etc.)
5. Encode `userData` — store nonce/timestamp for recovery
6. Build and send the `userLock` / `user_lock` transaction
7. Return `{ hash, hashlock, nonce: timestamp }`

### refund

1. Call `this.requireSigner()`
2. Encode and send `refundUser` / `refund_user` with the hashlock
3. Return tx hash string

### redeemSolver

1. Call `this.requireSigner()`
2. Convert secret to chain-native format
3. Encode and send `redeemSolver` / `redeem_solver` with hashlock, index, secret
4. Return tx hash string

### Error handling for all write operations

```ts
try {
    // simulate (if chain supports it) + send
} catch (error) {
    console.error('Error in {methodName}:', error)
    throw error
}
```

---

## 6. Read Operation Patterns

### getUserLockDetails

1. Query contract for user lock by hashlock
2. Check existence (sender ≠ zero address, or status ≠ 0) — return `null` if not found
3. If `txId` is provided, fetch transaction logs to extract `userData` (nonce)
4. Return `LockDetails` object with all fields mapped

### getSolverLockDetails — Count-Then-Loop Pattern

**This is a critical shared pattern.** The base class calls `getSolverLockDetails` for each node URL and verifies results match via `getSolverLockDetailsWithConsensus()`. Your subclass implements the single-node version. The contract stores multiple solver locks per hashlock. Always:

```ts
async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<LockDetails | null> {
    // 1. Get the count of solver locks for this hashlock
    const count = /* call getSolverLockCount(hashlock) */

    if (count === 0) return null

    // 2. Loop from 1 to count (1-indexed, NOT 0-indexed)
    for (let i = 1; i <= count; i++) {
        const result = /* call getSolverLock(hashlock, i) */

        // 3. Skip empty/invalid slots
        if (/* status === 0 or sender is empty */) continue

        // 4. Optional: filter by solver address (case-insensitive)
        if (params.solverAddress && sender.toLowerCase() !== params.solverAddress.toLowerCase()) continue

        // 5. Resolve using resolveLock() from resolveLock.ts and return with index
        const solverLock = resolveLock(result, id, params.tokenDecimals)
        if (!solverLock) continue
        return { ...solverLock, index: i }
    }

    return null
}
```

Key points:
- **1-indexed** — contract indices start at 1
- **Skip empty slots** — check status or sender
- **Case-insensitive solver address comparison**
- **Return first match** with early return
- **Include `index`** in the returned `LockDetails`

### recoverSwap

**Must validate the `txHash` format at the top of the function before making any RPC calls.** Throw `'Invalid transaction hash format'` if it doesn't match. Each chain has its own expected format:

- EVM: `/^0x[a-fA-F0-9]{64}$/`
- Starknet / Aztec: `/^0x[a-fA-F0-9]{1,64}$/`
- Solana: `/^[1-9A-HJ-NP-Za-km-z]{43,88}$/`

Then fetch transaction + receipt, parse the `UserLocked` event from logs, return `RecoveredSwapData`. If the event is not found, throw.

### getTransaction

Non-blocking status check for a transaction by hash. Used by `useUserLockPolling` to detect failed lock transactions before the lock appears on-chain. Returns `TransactionInfo | null`.

```ts
async getTransaction(txHash: string): Promise<TransactionInfo | null> {
    try {
        // 1. Fetch the transaction receipt/status using the chain's RPC
        const receipt = /* chain-specific receipt fetch */

        // 2. Map to TransactionStatus enum — must handle all three states:
        //    - TransactionStatus.Pending   — tx exists but not yet finalized
        //    - TransactionStatus.Confirmed — tx succeeded
        //    - TransactionStatus.Failed    — tx reverted/dropped/aborted

        // 3. Return TransactionInfo
        return {
            hash: txHash,
            status,                    // Required
            blockNumber: '...',        // Optional — string
        }
    } catch {
        return null
    }
}
```

Rules:
- **Always wrap in try/catch returning `null`** — this runs in a polling loop; thrown errors cause noisy console output
- **Must distinguish all three statuses** — `Pending`, `Confirmed`, `Failed`. Binary mappings (e.g., only Failed/Confirmed) cause incorrect early signals
- **Must be non-blocking** — do not use methods that wait for finalization (e.g., Fuel's `waitForResult`). If the chain SDK has no non-blocking alternative, document the limitation

---

## 7. resolveLock.ts — Lock Resolution (Pure Functions)

Lock resolution logic **must** be in a separate `resolveLock.ts` file as exported functions — not as private methods on the client class. This enables direct unit testing without mocking RPC.

### Required exports

Every chain must export a `resolveLock` function. Additional helpers (`parseSecret`, `mapLockStatus`) are exported when the chain needs them.

```ts
import { formatUnits, type LockDetails, LockStatus } from '@train-protocol/sdk'
import { ZERO_ADDRESS } from './constants.js'  // chain-specific zero check

export function resolveLock(
    result: any,
    id: string,
    tokenDecimals: number,
): LockDetails | null {
    // 1. Check for empty/zero sender — return null if not found
    //    Chain-specific: compare against ZERO_ADDRESS, NATIVE_SOL_ADDRESS, ZERO_B256, status === 0, etc.

    // 2. Detect solver lock: const isSolverLock = 'reward' in result

    // 3. Return LockDetails with all fields mapped:
    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), tokenDecimals)),
        secret: /* non-zero → BigInt, zero/empty → undefined */,
        sender: /* chain-specific address format */,
        recipient: /* undefined if zero/empty */,
        token: /* undefined if zero/empty (native token) */,
        timelock: Number(result.timelock),
        status: /* Number cast or chain-specific mapper */,
        ...(isSolverLock ? {
            reward: Number(result.reward),
            rewardTimelock: Number(result.rewardTimelock),
            rewardRecipient: /* undefined if zero/empty */,
            rewardToken: /* undefined if zero/empty */,
        } : {}),
    }
}
```

### Rules

- **Pure function** — no RPC calls, no side effects, no `this`
- **Return `null`** for empty/non-existent locks (zero sender, status === 0, etc.)
- **Map zero/empty addresses to `undefined`** — recipient, token, rewardRecipient, rewardToken
- **Map zero secret to `undefined`**, non-zero to `bigint`
- **Store reward as raw value** — `Number(result.reward)`, do not format with decimals (reward is never displayed to users)
- **Solver lock detection** via `'reward' in result` — only spread reward fields when present
- **Export additional helpers** when the chain needs them:
  - `parseSecret(bytes)` — Solana, Aztec (byte array → bigint | undefined)
  - `mapLockStatus(status)` — Starknet (CairoCustomEnum), Fuel (claimed vs status field)
  - Constants like `ZERO_B256` — Fuel

### Naming convention

The file is always `resolveLock.ts`. The primary export is always `resolveLock`. Client imports it as:
```ts
import { resolveLock } from './resolveLock.js'
```

---

## 8. index.ts — Registration & Exports

Because `types.ts` augments `HTLCClientConfigMap` and `WalletSignConfigMap`, the factory callbacks receive fully-typed configs — no `as` casts needed.

```ts
import { registerHTLCClient, registerWalletSign } from '@train-protocol/sdk'
import { {Chain}HTLCClient } from './client.js'
import { deriveKeyFrom{Chain}Wallet } from './login/index.js'

let registered = false

export function register{Chain}Sdk(): void {
    if (registered) return   // Idempotent guard
    registered = true

    // config is typed as {Chain}HTLCClientConfig — no casts required
    registerHTLCClient('{namespace}', (config) => new {Chain}HTLCClient(config))

    // config is typed as {Chain}WalletSignConfig — no casts required
    registerWalletSign('{namespace}', async (config) => {
        return deriveKeyFrom{Chain}Wallet(config.wallet)
    })
}

// Public exports
export { {Chain}HTLCClient } from './client.js'
export type { {Chain}HTLCClientConfig, {Chain}Signer, {Chain}WalletSignConfig } from './types.js'
export { deriveKeyFrom{Chain}Wallet } from './login/index.js'
export type { {Chain}WalletLike } from './login/index.js'
```

The `{namespace}` is the chain identifier used in the registry (e.g., `'eip155'` for EVM, `'aztec'` for Aztec).

### What to export

- `register{Chain}Sdk` — registration function
- `{Chain}HTLCClient` — class (for direct instantiation if needed)
- `{Chain}HTLCClientConfig` — config type
- `{Chain}Signer` — signer type
- `deriveKeyFrom{Chain}...` — key derivation function
- Any chain-specific wallet interface types needed by consumers

---

## 9. Login / Key Derivation

Each chain needs a `login/wallet-sign.ts` that derives a deterministic login key:

```ts
import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/sdk'

export const deriveKeyFrom{Chain}Wallet = async (
    /* chain-specific wallet/provider */
): Promise<Buffer> => {
    // 1. Sign a fixed message: "I am using TRAIN"
    //    Use the chain's native signing mechanism
    const signature = /* sign the message */

    // 2. Derive key material from signature
    const inputMaterial = Buffer.from(/* signature bytes */)
    const identitySalt = Buffer.from(IDENTITY_SALT, 'utf8')
    return Buffer.from(deriveKeyMaterial(inputMaterial, identitySalt))
}
```

Rules:
- Always use `"I am using TRAIN"` as the message content
- Always use `IDENTITY_SALT` and `deriveKeyMaterial` from the base SDK
- Define a minimal wallet/provider interface (don't import the full chain SDK for the type)

---

## 10. Shared SDK Imports

Always import these utilities from `@train-protocol/sdk` instead of reimplementing:

```ts
// Unit conversion
import { parseUnits, formatUnits } from '@train-protocol/sdk'

// Byte/hex conversion
import { hexToBytes, bytesToHex, toHex32 } from '@train-protocol/sdk'

// Base class & types
import {
    HTLCClient,
    UserLockParams,
    LockParams,
    RefundParams,
    RedeemSolverParams,
    LockDetails,
    LockStatus,
    AtomicResult,
    RecoveredSwapData,
    TransactionInfo,
    TransactionStatus,
    BaseHTLCClientConfig,
    ConsensusOptions,
} from '@train-protocol/sdk'

// Key derivation
import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/sdk'
```

---

## 11. Error Handling

| Context | Pattern |
|---------|---------|
| Write operations | `try { ... } catch (error) { console.error('Error in {method}:', error); throw error }` |
| Signer guard | `private requireSigner(): Signer { if (!this.signer) throw new Error('Signer required'); return this.signer }` |
| Lock not found | Return `null` (never throw for missing locks) |
| Event decoding | Wrap in try-catch, skip non-matching events silently |
| Transaction revert | Check chain-specific revert indicator, throw with method name + error |

---

## 12. Testing

### vitest.config.ts

Every blockchain package must alias `@train-protocol/sdk` to the SDK source to avoid ESM directory import issues:

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    resolve: {
        alias: {
            '@train-protocol/sdk': path.resolve(__dirname, '../../sdk/src/index.ts'),
        },
    },
    test: {
        include: ['src/__tests__/**/*.test.ts'],
    },
})
```

### resolveLock.test.ts — Required test structure

Every chain must have `__tests__/resolveLock.test.ts` that imports directly from `../resolveLock` (no mocking, no client instantiation). Tests follow a consistent structure — include all that apply to the chain:

```ts
import { describe, it, expect } from 'vitest'
import { LockStatus } from '@train-protocol/sdk'
import { resolveLock } from '../resolveLock'

describe('{Chain} resolveLock', () => {
    // 1. resolves a basic user lock — individual field assertions (not toEqual)
    // 2. returns null for empty/zero sender — chain-specific zero check
    // 3. maps empty/zero recipient to undefined
    // 4. maps empty/zero token to undefined
    // 5. parses non-zero secret
    // 6. maps zero/empty secret to undefined
    // 7. formats amount with correct decimals — use 6 decimals, 1500000n → 1.5
    // 8. maps status values correctly — loop or explicit checks for all LockStatus values
    // 9. resolves solver lock with reward fields — reward stored as raw value (not formatted), check rewardTimelock, rewardRecipient, rewardToken
    // 10. maps empty/zero reward recipient and reward token to undefined
    // 11. does not include reward fields for user locks — check all 4: reward, rewardTimelock, rewardRecipient, rewardToken
})
```

**Skip a test only when the chain genuinely doesn't support the feature** (e.g., TON has no reward fields yet, TON secret is always undefined). Do not skip tests because they seem redundant.

**Chain-specific test blocks** (add as separate `describe` blocks after the main one):
- `parseSecret` — Solana, Aztec (byte array handling, zero bytes, Uint8Array, null/undefined)
- `mapLockStatus` — Starknet (CairoCustomEnum, number, bigint, variant object), Fuel (0/1/2/default)
- `parseSolverLockFromStack` — TON (separate stack parser for solver locks)
- Chain-specific behaviors: Solana hashlock 0x normalization, Fuel claimed vs status field

**Tx hash validation** — every chain must have a `recoverSwap tx hash validation` describe block testing the regex pattern:
```ts
describe('{Chain} recoverSwap tx hash validation', () => {
    const regex = /* chain-specific regex */
    it('accepts valid {chain} tx hash', () => { ... })
    it('rejects invalid formats', () => { ... })
})
```

---

## 13. Constants

Define chain-specific constants in `constants.ts` (shared between `client.ts` and `resolveLock.ts`):

```ts
// constants.ts
export const ZERO_ADDRESS = '0x000...'     // Chain's empty/zero address representation
```

Client-only constants stay in `client.ts`:

```ts
const TX_TIMEOUT = 120000           // Transaction confirmation timeout (ms)
```

---

## Summary Checklist for New Chain SDK

- [ ] Create `packages/{chain}/` with the directory structure above
- [ ] In `types.ts`:
  - [ ] Define `{Chain}Signer` interface and `{Chain}HTLCClientConfig` type
  - [ ] Define `{Chain}WalletSignConfig` type
  - [ ] Add `declare module '@train-protocol/sdk'` augmentation for `HTLCClientConfigMap` and `WalletSignConfigMap`
- [ ] Implement `resolveLock()` as an exported pure function in `resolveLock.ts`
  - [ ] Handle zero/empty sender → return `null`
  - [ ] Map zero/empty addresses (recipient, token, rewardRecipient, rewardToken) → `undefined`
  - [ ] Map zero secret → `undefined`, non-zero → `bigint`
  - [ ] Store reward as raw value — `Number(result.reward)`, no decimal formatting
  - [ ] Export any chain-specific helpers (`parseSecret`, `mapLockStatus`)
- [ ] Implement `{Chain}HTLCClient extends HTLCClient` in `client.ts`
  - [ ] Import and call `resolveLock()` from `./resolveLock.js` (not as private method)
  - [ ] Follow function ordering: writes → reads → public helpers → private helpers
- [ ] Implement count-then-loop pattern in `getSolverLockDetails` (1-indexed, single-node version)
- [ ] Implement `getTransaction(txHash)` — non-blocking, try/catch returning `null`, all three statuses (`Pending`/`Confirmed`/`Failed`)
- [ ] Set `this.consensusOptions` in constructor if chain needs non-default quorum (default: `minQuorum: 2`)
- [ ] Validate `txHash` format at the top of `recoverSwap` before any RPC calls
- [ ] Define chain constants (`ZERO_ADDRESS`, etc.) in `constants.ts`
- [ ] Define `{Chain}WalletLike` minimal interface in `login/wallet-sign.ts`
- [ ] Implement key derivation in `login/wallet-sign.ts` using `deriveKeyMaterial` + `IDENTITY_SALT`
- [ ] Create idempotent `register{Chain}Sdk()` in `index.ts` — pass config directly (no `as` casts)
- [ ] Export: registration fn, client class, config type, signer type, wallet sign config type, key derivation fn, wallet-like type
- [ ] Use shared SDK utils (`parseUnits`, `formatUnits`, `hexToBytes`, etc.)
- [ ] Add `resolveLock.test.ts` in `__tests__/` following the consistent 13-point test structure
- [ ] Add `recoverSwap tx hash validation` describe block in the test file
- [ ] Configure `vitest.config.ts` with `@train-protocol/sdk` source alias
- [ ] Add contract ABI/artifacts in `abis/` or `artifacts/`
