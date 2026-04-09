---
paths:
  - "packages/blockchains/**"
---

# Chain SDK Integration Rules

Rules and patterns for adding new blockchain HTLC client SDKs. Derived from `evm`, `starknet`, `solana`, and `aztec` implementations.

---

## 1. Package Structure

```
packages/blockchains/{chain}/
├── src/
│   ├── client.ts           # Main HTLC client class
│   ├── index.ts            # Registration + public exports
│   ├── types.ts            # Signer interface + client config type
│   ├── login/
│   │   ├── index.ts        # Re-exports from wallet-sign.ts
│   │   └── wallet-sign.ts  # Key derivation for this chain's wallet
│   ├── abis/ or artifacts/ # Contract ABI/artifacts (chain-specific format)
│   └── __tests__/
│       └── register{Chain}Sdk.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

Additional utility files are common:
- `helpers.ts` — event data extraction (e.g., `pickEventDerivedData`)
- `utils.ts` — chain-specific utilities (e.g., `decodeContractError`, hex helpers)
- `rpc.ts` — custom RPC client if the chain needs one
- `constants.ts` — chain-specific constants (zero addresses, fee limits, function signatures)

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
    "@train-protocol/sdk": "workspace:^",
    "@train-protocol/auth": "workspace:^"
  },
  "devDependencies": {
    "@train-protocol/sdk": "workspace:^",
    "@train-protocol/auth": "workspace:^",
    "@types/node": "^20",
    "rimraf": "^6.0.1",
    "typescript": "catalog:",
    "vitest": "^4.0.18"
  },
  "engines": { "node": ">=18" }
}
```

Chain-specific libraries go in `dependencies`. The base SDK and auth package are always `peerDependencies`.

---

## 3. types.ts — Signer, Config & Registry Augmentation

Every SDK defines a **Signer** interface, two **Config** types (public + wallet), a **WalletSignConfig** type, and augments the SDK registry maps via declaration merging:

```ts
import type { {Chain}WalletLike } from './login/index.js'

// Augment the SDK registries so the factory callbacks are fully typed.
declare module '@train-protocol/sdk' {
    interface HTLCPublicClientConfigMap {
        {namespace}: {Chain}HTLCPublicClientConfig
    }
    interface HTLCWalletClientConfigMap {
        {namespace}: {Chain}HTLCWalletClientConfig
    }
}

// Augment the auth registry for wallet sign configs.
declare module '@train-protocol/auth' {
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

// Public client config — read-only operations, no signer.
export type {Chain}HTLCPublicClientConfig = {
    rpcUrl: string
}

// Wallet client config — extends public config with REQUIRED signer.
export type {Chain}HTLCWalletClientConfig = {Chain}HTLCPublicClientConfig & {
    signer: {Chain}Signer
}
```

---

## 4. client.ts — Class Structure & Function Ordering

### Two-class pattern

Each chain implements two classes: a **public client** (read-only) and a **wallet client** (write, extends public). The wallet client inherits all read methods — no code duplication.

```ts
import { HTLCPublicClient } from '@train-protocol/sdk'
import type { IHTLCWalletClient } from '@train-protocol/sdk'

// Public client — read-only operations, no signer required
export class {Chain}HTLCPublicClient extends HTLCPublicClient {
    protected rpc: ...

    constructor(config: {Chain}HTLCPublicClientConfig) {
        super()
        this.rpc = ...
        // Override consensus options if needed: this.consensusOptions = { minQuorum: 1 }
    }

    // ── Read Operations ────────────────────────────────────────────────
    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> { ... }
    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> { ... }
    async recoverSwap(txHash: string, network: Network): Promise<UserLockDetails> { ... }
    async getTransaction(txHash: string): Promise<TransactionInfo | null> { ... }
}

// Wallet client — write operations, signer REQUIRED at construction
export class {Chain}HTLCWalletClient extends {Chain}HTLCPublicClient implements IHTLCWalletClient {
    private signer: {Chain}Signer

    constructor(config: {Chain}HTLCWalletClientConfig) {
        super(config)
        this.signer = config.signer  // guaranteed present — no runtime check needed
    }

    // ── Write Operations ───────────────────────────────────────────────
    async userLock(params: UserLockParams): Promise<AtomicResult> { ... }
    async refund(params: RefundParams): Promise<string> { ... }
    async redeemSolver(params: RedeemSolverParams): Promise<string> { ... }
    // ... chain-specific write helpers
}
```

### Ordering rules

1. **Write operations first** — `userLock` → `refund` → `redeemSolver`
2. **Read operations second** — `getUserLockDetails` → `getSolverLockDetails` → `recoverSwap`
3. **Public helpers third** — `getTransaction`
4. **Private helpers last** — `requireSigner()` first, then chain-specific utilities
5. **Use section comments** — `// ── Write Operations ───...` / `// ── Public Helpers ───...` separator style between groups

### Base class methods (do NOT override)

The base `HTLCPublicClient` class provides this method — subclasses should **not** override it:

- `getSolverLockDetailsWithConsensus(params, nodeUrls, options?)` — queries multiple nodes via `getSolverLockDetails`, validates results match across nodes (see below)

### Cross-node consensus

The base class provides `getSolverLockDetailsWithConsensus()` which fans out `getSolverLockDetails()` to multiple RPC nodes and validates that all successful responses agree on critical fields (`amount`, `sender`, `recipient`, `token`, `timelock`).

**Consensus options:**
- The `HTLCPublicClient` base class sets `protected consensusOptions: Required<ConsensusOptions> = { minQuorum: 2, batchSize: 3 }` by default
- Subclasses can override this in their constructor (e.g., Aztec sets `minQuorum: 1` since it typically has fewer public nodes)
- Per-call `options` passed to `getSolverLockDetailsWithConsensus()` take priority over the instance default

**How it works:**
1. Partitions `nodeUrls` into batches of `batchSize`
2. Queries each batch in parallel via `Promise.allSettled`
3. Filters for non-null results
4. Requires at least `minQuorum` agreeing results (capped to `nodeUrls.length`)
5. Compares critical fields (`amount`, `sender`, `recipient`, `token`, `timelock`, `status`) across all valid results — throws if they disagree
6. Returns the first valid result if consensus passes
7. Supports `prefetchedResult` option to skip re-querying the first node

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
2. Check existence (sender ≠ zero address, or status ≠ 0) — return `null` early if not found
3. Build a `BaseLockDetails` object with all required fields (hashlock, amount, secret, sender, timelock, status, recipient, token)
4. If `txId` is provided, fetch transaction logs and extract `EventDerivedData` (destination info, userData, solverData, reward fields) using a helper like `pickEventDerivedData(event)`
5. Return `{ ...parsedResult, ...eventDerivedData, blockTimestamp }` as `UserLockDetails`

**Key rules for field mapping:**
- All `BaseLockDetails` fields are **required** — always populate `sender`, `recipient`, `token` (use empty string `''` if absent, never `undefined`)
- `secret` is always `bigint` — use `BigInt(result.secret)`, no conditional check for zero
- `amount` uses `params.decimals` directly — no fallback like `?? 18`

### getSolverLockDetails — Count-Then-Loop Pattern

**This is a critical shared pattern.** The base class calls `getSolverLockDetails` for each node URL and verifies results match via `getSolverLockDetailsWithConsensus()`. Your subclass implements the single-node version. The contract stores multiple solver locks per hashlock. Always:

```ts
async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> {
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

        // 5. Return first matching lock with all BaseLockDetails + Reward fields
        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals)),
            secret: BigInt(result.secret),
            timelock: Number(result.timelock),
            status: Number(result.status) as LockStatus,
            sender,
            recipient: result.recipient,
            token: result.token,
            reward: Number(formatUnits(BigInt(result.reward), params.decimals)),
            rewardTimelock: Number(result.rewardTimelock),
            rewardRecipient: result.rewardRecipient,
            rewardToken: result.rewardToken,
            index: i,
        }
    }

    return null
}
```

Key points:
- **1-indexed** — contract indices start at 1
- **Skip empty slots** — check status or sender
- **Case-insensitive solver address comparison**
- **Return first match** with early return
- **Include `index`** in the returned `SolverLockDetails`
- **All `BaseLockDetails` fields are required** — `secret` is always `bigint`, `sender`/`recipient`/`token` are always strings
- **Use `params.decimals` directly** — no `?? 18` fallback

### recoverSwap

**Must validate the `txHash` format at the top of the function before making any RPC calls.** Throw `'Invalid transaction hash format'` if it doesn't match. Each chain has its own expected format:

- EVM: `/^0x[a-fA-F0-9]{64}$/`
- Starknet / Aztec: `/^0x[a-fA-F0-9]{1,64}$/`
- Solana: `/^[1-9A-HJ-NP-Za-km-z]{43,88}$/`

Then fetch transaction + receipt, parse the `UserLocked` event from logs to extract the hashlock and token address. Use the `Network` parameter to look up token decimals, then delegate to `this.getUserLockDetails()` with `txId: txHash`. Return `UserLockDetails`. If the event is not found or `getUserLockDetails` returns null, throw.

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
            blockTimestamp: 123456,     // Optional — ms since epoch (only if cheap to obtain)
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
- **Avoid unnecessary RPC calls** — do not fetch block data for `blockTimestamp` if the polling consumer only needs `status`. Keep it minimal
- **Do not fetch `blockTimestamp` by default** — only include it if the chain returns it alongside the receipt at no extra cost

---

## 7. index.ts — Registration & Exports

Because `types.ts` augments `HTLCPublicClientConfigMap`, `HTLCWalletClientConfigMap`, and `WalletSignConfigMap`, the factory callbacks receive fully-typed configs — no `as` casts needed.

```ts
import { registerHTLCPublicClient, registerHTLCWalletClient } from '@train-protocol/sdk'
import { registerWalletSign } from '@train-protocol/auth'
import { {Chain}HTLCPublicClient, {Chain}HTLCWalletClient } from './client.js'
import { deriveKeyFrom{Chain}Wallet } from './login/index.js'

let registered = false

export function register{Chain}Sdk(): void {
    if (registered) return   // Idempotent guard
    registered = true

    registerHTLCPublicClient('{namespace}', (config) => new {Chain}HTLCPublicClient(config))
    registerHTLCWalletClient('{namespace}', (config) => new {Chain}HTLCWalletClient(config))

    registerWalletSign('{namespace}', async (config) => {
        return deriveKeyFrom{Chain}Wallet(config.wallet)
    })
}

// Public exports
export { {Chain}HTLCPublicClient, {Chain}HTLCWalletClient } from './client.js'
export type { {Chain}HTLCPublicClientConfig, {Chain}HTLCWalletClientConfig, {Chain}Signer, {Chain}WalletSignConfig } from './types.js'
export { deriveKeyFrom{Chain}Wallet } from './login/index.js'
export type { {Chain}WalletLike } from './login/index.js'
```

The `{namespace}` is the chain identifier used in the registry (e.g., `'eip155'` for EVM, `'aztec'` for Aztec).

### What to export

- `register{Chain}Sdk` — registration function
- `{Chain}HTLCPublicClient` — public (read-only) client class
- `{Chain}HTLCWalletClient` — wallet (write) client class
- `{Chain}HTLCPublicClientConfig` — public client config type
- `{Chain}HTLCWalletClientConfig` — wallet client config type
- `{Chain}Signer` — signer type
- `deriveKeyFrom{Chain}...` — key derivation function
- Any chain-specific wallet interface types needed by consumers

---

## 8. Login / Key Derivation

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

## 9. Shared SDK Imports

Always import these utilities from `@train-protocol/sdk` instead of reimplementing:

```ts
// Unit conversion
import { parseUnits, formatUnits } from '@train-protocol/sdk'

// Byte/hex conversion
import { hexToBytes, bytesToHex, toHex32 } from '@train-protocol/sdk'

// Base classes & types
import {
    HTLCPublicClient,
    UserLockParams,
    LockParams,
    RefundParams,
    RedeemSolverParams,
    LockStatus,
    AtomicResult,
    Network,
    TransactionInfo,
    TransactionStatus,
    ConsensusOptions,
} from '@train-protocol/sdk'
import type {
    UserLockDetails,
    SolverLockDetails,
    BaseLockDetails,
    EventDerivedData,
} from '@train-protocol/sdk'

// Key derivation
import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/sdk'
```

---

## 10. Error Handling

| Context | Pattern |
|---------|---------|
| Write operations | `try { ... } catch (error) { console.error('Error in {method}:', error); throw error }` |
| Signer guard | `private requireSigner(): Signer { if (!this.signer) throw new Error('Signer required'); return this.signer }` |
| Lock not found | Return `null` (never throw for missing locks) |
| Event decoding | Wrap in try-catch, skip non-matching events silently |
| Transaction revert | Check chain-specific revert indicator, throw with method name + error |

---

## 11. Testing

Minimal test in `__tests__/register{Chain}Sdk.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getRegisteredNamespaces, createHTLCPublicClient } from '@train-protocol/sdk'
import { register{Chain}Sdk } from '../index'

describe('register{Chain}Sdk', () => {
    beforeEach(() => { register{Chain}Sdk() })

    it('registers the {namespace} namespace', () => {
        expect(getRegisteredNamespaces()).toContain('{namespace}')
    })

    it('creates a public client with required methods', () => {
        const client = createHTLCPublicClient('{namespace}', {
            rpcUrl: 'https://...',
        })
        expect(typeof client.getUserLockDetails).toBe('function')
        expect(typeof client.getSolverLockDetails).toBe('function')
        expect(typeof client.getSolverLockDetailsWithConsensus).toBe('function')
    })
})
```

---

## 12. Constants

Define chain-specific constants in `constants.ts` (preferred) or at the top of `client.ts`:

```ts
export const TX_TIMEOUT = 120000           // Transaction confirmation timeout (ms)
export const ZERO_ADDRESS = '0x000...'     // Chain's empty/zero address representation
```

---

## Summary Checklist for New Chain SDK

- [ ] Create `packages/{chain}/` with the directory structure above
- [ ] In `types.ts`:
  - [ ] Define `{Chain}Signer` interface
  - [ ] Define `{Chain}HTLCPublicClientConfig` (rpcUrl only) and `{Chain}HTLCWalletClientConfig` (extends public + required signer)
  - [ ] Define `{Chain}WalletSignConfig` type
  - [ ] Add `declare module '@train-protocol/sdk'` augmentation for both `HTLCPublicClientConfigMap` and `HTLCWalletClientConfigMap`
- [ ] Implement `{Chain}HTLCPublicClient extends HTLCPublicClient` in `client.ts` (read operations)
- [ ] Implement `{Chain}HTLCWalletClient extends {Chain}HTLCPublicClient implements IHTLCWalletClient` (write operations)
- [ ] Public client: read methods + helpers. Wallet client: write methods only (inherits reads)
- [ ] Implement count-then-loop pattern in `getSolverLockDetails` (1-indexed, single-node version)
- [ ] Implement `getTransaction(txHash)` — non-blocking, try/catch returning `null`, all three statuses (`Pending`/`Confirmed`/`Failed`)
- [ ] Set `this.consensusOptions` in constructor if chain needs non-default quorum (default: `minQuorum: 2`)
- [ ] Validate `txHash` format at the top of `recoverSwap` before any RPC calls
- [ ] Define `{Chain}WalletLike` minimal interface in `login/wallet-sign.ts`
- [ ] Implement key derivation in `login/wallet-sign.ts` using `deriveKeyMaterial` + `IDENTITY_SALT`
- [ ] Create idempotent `register{Chain}Sdk()` in `index.ts` — register both public and wallet client factories
- [ ] Export: registration fn, both client classes, both config types, signer type, wallet sign config type, key derivation fn, wallet-like type
- [ ] Use shared SDK utils (`parseUnits`, `formatUnits`, `hexToBytes`, etc.)
- [ ] Add registration test in `__tests__/`
- [ ] Add contract ABI/artifacts in `abis/` or `artifacts/`
