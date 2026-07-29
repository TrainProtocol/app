---
paths:
  - "packages/blockchains/**"
---

# Chain SDK Integration Rules

Rules and patterns for adding new blockchain HTLC client SDKs. Derived from `evm`, `starknet`, `solana`, `tron`, and `aztec` implementations.

---

## 1. Package Structure

```
packages/blockchains/{chain}/
├── src/
│   ├── client/
│   │   ├── index.ts             # Re-exports PublicClient + WalletClient
│   │   ├── PublicClient.ts      # Read-only client class (delegates to public/*.ts)
│   │   ├── WalletClient.ts      # Write client class (delegates to wallet/*.ts)
│   │   ├── helpers.ts           # Event parsing helpers (chain-specific)
│   │   ├── public/
│   │   │   ├── getUserLockDetails.ts   # Includes resolveUserLock + chain-specific event extraction
│   │   │   ├── getSolverLockDetails.ts # Includes resolveSolverLock
│   │   │   ├── getTransaction.ts
│   │   │   ├── recoverSwap.ts
│   │   │   └── get{Standard}Allowance.ts # If the chain has an allowance flow (e.g. ERC20/TRC20)
│   │   └── wallet/
│   │       ├── userLock.ts             # Executor — orchestrates build + simulate + send
│   │       ├── buildUserLockTx.ts      # Builder — params → TransactionRequest
│   │       ├── refund.ts
│   │       ├── buildRefundTx.ts
│   │       ├── redeemSolver.ts
│   │       ├── buildRedeemSolverTx.ts
│   │       └── buildApproveTx.ts       # If the chain has a token approval flow
│   ├── index.ts            # Registration + public exports
│   ├── types.ts            # Signer interface + client config types + TransactionRequest
│   ├── constants.ts        # Chain-specific constants (zero addresses, fee limits) — omit if none
│   ├── utils.ts            # Chain-specific utilities (hex helpers, address normalization)
│   ├── abi.ts              # ABI/function definitions when applicable (EVM/Tron use ox AbiFunction defs)
│   ├── rpc.ts              # Custom RPC client (if needed — EVM/Tron)
│   ├── login/
│   │   ├── index.ts
│   │   └── wallet-sign.ts
│   ├── abis/ or artifacts/ or idl/
│   └── __tests__/
│       ├── resolveLock.test.ts  # Tests for resolveUserLock + resolveSolverLock
│       ├── builders.test.ts     # Tests for build*Tx outputs
│       ├── helpers.test.ts      # Tests for helper pure functions
│       └── register{Chain}Sdk.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Key structural rules:**
- Each read/write method lives in its own file under `client/public/` or `client/wallet/`
- `resolveUserLock()` is co-located in `getUserLockDetails.ts`, `resolveSolverLock()` in `getSolverLockDetails.ts` — exported for testing
- Event-data extraction is co-located in `getUserLockDetails.ts` (EVM/Tron/Solana) or `client/helpers.ts` (Starknet/Aztec)
- Each protocol write operation (`userLock`, `refund`, `redeemSolver`) has a **paired builder file** (`build{Method}Tx.ts`) and an **executor file** (`{method}.ts`):
  - The **builder** takes params and returns the chain's natural prepared transaction/call shape (`{Chain}TransactionRequest`). It never broadcasts or executes an on-chain state change. Builders are sync and pure on EVM/Tron/Starknet; Solana and Aztec builders are async because preparation requires chain dependencies. Aztec preparation also registers contracts locally on the wallet, and `buildUserLockTx` returns an **array** `[authwit, userLock]` to be batched.
  - The **executor** is a standalone async function taking `(rpc, signer, params)` (chain-specific equivalents) — it consumes the builder, performs simulation/preflight reads, and sends via the signer. Client methods adapt their stored dependencies and delegate to these functions.
  - Builders are exposed as public methods on the wallet client (`buildUserLockTx`, `buildRefundTx`, `buildRedeemSolverTx`, plus the standalone `buildApproveTx` if the chain uses ERC20-style allowances) so integrators can inspect, compose, batch, or submit them with chain-specific infrastructure.
- Shared utilities (`hex`, address normalization, error decoding, etc.) go in `src/utils.ts`
- Chain-specific extras are fine where warranted: Tron has `address.ts` (hex↔base58), Aztec has `client/public/storage.ts` and contract `artifacts/`, Solana has `idl/`

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
    "rimraf": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  },
  "engines": { "node": ">=18" }
}
```

Chain-specific libraries go in `dependencies`. The base SDK and auth package are always `peerDependencies` (and mirrored in `devDependencies`). Tooling (`rimraf`, `typescript`, `vitest`) is pinned via `catalog:`.

---

## 3. types.ts — Signer, Config, TransactionRequest & Registry Augmentation

Every new SDK should define a **Signer** interface, expose a named **TransactionRequest** type, define two **Config** types (public + wallet) plus a **WalletSignConfig** type, and augment the SDK + auth registry maps via declaration merging:

```ts
// Augment the SDK registries so the factory callbacks are fully typed.
declare module '@train-protocol/sdk' {
    interface HTLCPublicClientConfigMap {
        {namespace}: {Chain}HTLCPublicClientConfig
    }
    interface HTLCWalletClientConfigMap {
        {namespace}: {Chain}HTLCWalletClientConfig
    }
    interface HTLCTransactionRequestMap {
        {namespace}: {Chain}TransactionRequest
    }
}

// Augment the auth registry for wallet sign configs.
declare module '@train-protocol/auth' {
    interface WalletSignConfigMap {
        {namespace}: {Chain}WalletSignConfig
    }
}

// Config passed to deriveKeyFromWallet('{namespace}', config).
// Shape varies per chain: { wallet } (Solana/Tron), { provider, address, options? }
// (EVM/Starknet), { wallet, address } (Aztec).
export type {Chain}WalletSignConfig = {
    // Chain-specific wallet/provider plus address/options when required
}

// The built, unsubmitted transaction/call shape returned by the builders.
// May be a local interface (EVM `{ to, data, value?, chainId? }`, Tron TronGrid
// payload) or an alias of a chain-library type (Starknet `Call`,
// Solana `Transaction`, Aztec `ContractFunctionInteraction`).
export interface {Chain}TransactionRequest { ... }

// Minimal signer interface — wraps the chain's wallet/signing mechanism.
// Examples: EVM { address, sendTransaction(tx) }, Tron { address, signAndBroadcast(tx) },
// Starknet { address, account }, Solana { publicKey, sendTransaction(tx) },
// Aztec { wallet, address }.
export interface {Chain}Signer {
    // Chain-specific identity and signing method(s)
}

// Public client config — read-only operations, no signer.
// May carry chain-specific extras (EVM: chainId?, Tron: apiKey?).
export type {Chain}HTLCPublicClientConfig = {
    rpcUrl: string
}

// Wallet client config — extends public config with REQUIRED signer.
export type {Chain}HTLCWalletClientConfig = {Chain}HTLCPublicClientConfig & {
    signer: {Chain}Signer
}
```

Existing exception: Aztec's *public* config accepts an optional `signer?` so the wallet config can refine the same shape to a required signer; its public read methods still use the node. Keep new public configs signer-free unless a read operation genuinely requires wallet access.

Existing exception: Solana maps `HTLCTransactionRequestMap.solana` directly to `@solana/web3.js`'s `Transaction` rather than defining and re-exporting a `SolanaTransactionRequest` alias. New integrations should still expose a named alias so consumers do not need to know the registry's underlying library type.

---

## 4. Client Classes — Thin Facades

### Two-class pattern

Each chain implements two classes: a **public client** (read-only) and a **wallet client** (write, extends public). The wallet client inherits all read methods — no code duplication. Both classes are **thin facades**: they own long-lived chain dependencies (RPC/provider/node, signer, program factories) and adapt those dependencies into the corresponding `client/public/*.ts` or `client/wallet/*.ts` function. Protocol mapping, transaction construction, and submission logic stay in those standalone functions. Simple chains use one-line delegations; chains such as Solana may construct a program or other chain-specific dependency before delegating.

```ts
import { HTLCPublicClient } from '@train-protocol/sdk'
import type { IHTLCWalletClient } from '@train-protocol/sdk'

// PublicClient.ts — read-only operations, no signer required
export class {Chain}HTLCPublicClient extends HTLCPublicClient {
    protected rpc: ...

    constructor(config: {Chain}HTLCPublicClientConfig) {
        super()
        this.rpc = ...
        // Override consensus options if needed: this.consensusOptions = { minQuorum: 1, batchSize: 1 }
    }

    async getUserLockDetails(params: LockParams): Promise<UserLockDetails | null> { return getUserLockDetails(this.rpc, params) }
    async getSolverLockDetails(params: LockParams, nodeUrl: string): Promise<SolverLockDetails | null> { return getSolverLockDetails(params, nodeUrl) }
    async recoverSwap(txHash: string, network: Network): Promise<UserLockDetails> { return recoverSwap(this.rpc, txHash, network) }
    async getTransaction(txHash: string): Promise<TransactionInfo | null> { return getTransaction(this.rpc, txHash) }
    // If the chain has allowances, the standard-specific read lives here
    // (EVM example):
    async getErc20Allowance(token: string, owner: string, spender: string): Promise<bigint> { ... }
}

// WalletClient.ts — write operations, signer REQUIRED at construction
export class {Chain}HTLCWalletClient extends {Chain}HTLCPublicClient implements IHTLCWalletClient<{Chain}TransactionRequest> {
    private signer: {Chain}Signer

    constructor(config: {Chain}HTLCWalletClientConfig) {
        super(config)
        this.signer = config.signer  // guaranteed present — no runtime check needed
    }

    // ── Write Operations ───────────────────────────────────────────────
    async userLock(params: UserLockParams): Promise<AtomicResult> { return userLock(this.rpc, this.signer, params) }
    async refund(params: RefundParams): Promise<string> { ... }
    async redeemSolver(params: RedeemSolverParams): Promise<string> { ... }

    // ── Transaction Builders ──────────────────────────────────────────
    buildUserLockTx(params: UserLockParams): {Chain}TransactionRequest { ... }
    buildRefundTx(params: RefundParams): {Chain}TransactionRequest { ... }
    buildRedeemSolverTx(params: RedeemSolverParams): {Chain}TransactionRequest { ... }
    buildApproveTx(params: BuildApproveTxParams): {Chain}TransactionRequest { ... }  // allowance chains only
}
```

`IHTLCWalletClient<TTx>` is generic over the transaction-request type and includes the builder methods; builders may be sync or async and `buildUserLockTx` may return an array. New clients should supply the chain transaction type to `implements` so the shared interface checks the builder boundary; the five existing clients currently use bare `IHTLCWalletClient` (whose `TTx` defaults to `unknown`) and rely on their concrete method signatures for narrower return types.

### Ordering rules

1. **Write operations first** — `userLock` → `refund` → `redeemSolver`
2. **Transaction builders second** — under a `// ── Transaction Builders ──` section comment
3. **Reads live on the public client** — `getUserLockDetails` → `getSolverLockDetails` → `recoverSwap` → `getTransaction` (+ allowance read)

### Base class methods (do NOT override)

The base `HTLCPublicClient` class provides this method — subclasses should **not** override it:

- `getSolverLockDetailsWithConsensus(params, nodeUrls, options?)` — queries multiple nodes via `getSolverLockDetails`, validates results match across nodes (see below)

### Cross-node consensus

The base class provides `getSolverLockDetailsWithConsensus()` which fans out `getSolverLockDetails()` to multiple RPC nodes and validates a defined set of lock fields across the non-null results queried before quorum is reached. It does not compare every `SolverLockDetails` field: notably `secret` and reward fields are not part of consensus.

**Consensus options:**
- The `HTLCPublicClient` base class sets `protected consensusOptions: Required<ConsensusOptions> = { minQuorum: 2, batchSize: 3 }` by default
- Subclasses can override this in their constructor (currently Starknet and Aztec both set `{ minQuorum: 1, batchSize: 1 }`)
- Per-call `options` passed to `getSolverLockDetailsWithConsensus()` take priority over the instance default
- `minQuorum` and `batchSize` are not runtime-validated; callers must provide positive integers (`batchSize: 0` would prevent batching from advancing)

**How it works:**
1. Partitions `nodeUrls` into batches of `batchSize`
2. Queries each batch in parallel via `Promise.allSettled`
3. Filters for non-null results
4. Accumulates non-null results until their count reaches `minQuorum` (capped to `nodeUrls.length`); it then requires **all accumulated results** to match rather than searching for an agreeing quorum subset
5. Compares `hashlock` (case-insensitive), `index`, `sender`, `recipient`, `token`, `refundTo`, `payoutCurve`, `timelock`, `status`, and amount (via `amountInBaseUnits` if either side provides it, otherwise stringified `amount`) — throws if any accumulated result disagrees
6. Returns `ConsensusResult { details, agreedCount }` (first valid result + number of matching accumulated results). Returns `null` when there are no nodes/prefetch or when every queried node fulfills with `null`; if there are no valid results and at least one request rejects, it rethrows the last rejection
7. Supports `prefetchedResult` option — counts as `nodeUrls[0]`'s result and can satisfy quorum alone (e.g. Aztec `minQuorum: 1`)

Chain implementations only need to implement the single-node abstract method `getSolverLockDetails(params, nodeUrl)`.

---

## 5. Write Operation Patterns

Each protocol write operation is split into two files under `client/wallet/`: a **builder** (`build{Method}Tx.ts`) that returns a `{Chain}TransactionRequest`, and an **executor** (`{method}.ts`) that consumes the builder, performs chain-specific preflight work, and sends via the signer. Token approval is a supporting builder used by `userLock`, not a separate protocol executor.

### Builder/executor split

- **Builder**: never broadcasts or executes an on-chain state change. Inputs are the method's params; output is the chain's prepared transaction/call shape. Sync and pure on EVM/Tron/Starknet. Async on Solana/Aztec where preparation requires the wallet/node; Aztec builders also register Train/Token contract metadata locally on the wallet. Exposed as a public method on the wallet client.
- **Executor**: standalone async function taking `(rpc, signer, params)` or chain-specific equivalents. Calls the builder, performs any preflight (allowance check via the public-client read, simulation via `eth_call` or equivalent), then submits via the signer. Returns `AtomicResult` for `userLock`, tx hash string for `refund`/`redeemSolver`.
- **Token approval/allowance**: the SDK exports the canonical `BuildApproveTxParams = { token, spender, amount }` shape. EVM, Tron, and Starknet currently define and re-export identical package-local interfaces. EVM and Tron pair `buildApproveTx` with `getErc20Allowance` / `getTrc20Allowance`; Starknet has no allowance read and batches an unconditional approve call with the lock.

### userLock (`client/wallet/userLock.ts`)

1. Determine native vs token using the chain's actual representation. EVM/Tron treat an empty contract or `ZERO_ADDRESS` as native; Solana treats an empty contract or `NATIVE_SOL_ADDRESS` as native. Starknet models assets as token contracts and Aztec's current lock builder requires a token contract, so neither follows that native-token branch.
2. Parse amount with `parseUnits(params.amount.toString(), params.sourceAsset.decimals)`
3. Apply the chain's authorization flow: EVM/Tron check allowance and, if insufficient, send a separate approval and wait for confirmation; Starknet batches `[approveCall, lockCall]` in one `account.execute`; Solana needs no allowance; Aztec batches a public authwit with the lock
4. Build the lock tx via `buildUserLockTx(params)`
5. Simulate if the chain supports it (`eth_call` with the built calldata)
6. Send via signer
7. Return `{ hash, hashlock: params.hashlock, nonce: params.nonce }`

**Submission/confirmation semantics:**
- EVM/Tron approval and lock are separate transactions. A lock failure can leave a successful approval behind. Their lock/refund/redeem executors simulate before submission but return after broadcast without waiting for the operation receipt.
- Starknet sends approve + lock as one multicall and waits for the transaction; refund/redeem also wait.
- Solana sends one transaction and calls `confirmTransaction`, rejecting confirmation errors.
- Aztec sends the authwit + lock as one `BatchCall`; all write executors wait and explicitly reject reverted receipts.

### refund

1. Build via `buildRefundTx` (encodes `refundUser` / `refund_user` with the hashlock)
2. Send via signer, return tx hash string

### redeemSolver

1. Convert secret to chain-native format
2. Build via `buildRedeemSolverTx` (encodes `redeemSolver` / `redeem_solver` with hashlock, index, secret). New integrations should use `params.index ?? 1`; current EVM and Tron builders hard-code index `1`, while Starknet, Solana, and Aztec honor `params.index ?? 1`.
3. Send via signer, return tx hash string

---

## 6. Read Operation Patterns

### getUserLockDetails

Each chain's `getUserLockDetails.ts` file contains both the async function and an exported `resolveUserLock()` pure function for lock field mapping:

1. Query contract for user lock by hashlock
2. Call `resolveUserLock(result, id, params.decimals)` — returns `BaseLockDetails | null`
3. If null, return null early
4. If `txId` is provided, best-effort event extraction is chain-specific: EVM/Tron use co-located `pickEventDerivedData`, Starknet uses `pickStarknetEventData`, Solana parses Anchor logs in the same file, and Aztec uses `findEventDataFromLogs`
5. Populate `blockTimestamp` in milliseconds where implemented: EVM fetches the receipt block, Tron uses `blockTimeStamp`, and Solana uses `blockTime`. Starknet and Aztec currently omit it.
6. Solana additionally attempts to recover a closed user-lock account from the PDA's latest transaction, returning terminal `Refunded`/`Redeemed` details with unavailable fields zeroed/empty

**`resolveUserLock` must be an exported pure function** in the same file — this enables direct unit testing:
```ts
export function resolveUserLock(result: any, id: string, decimals: number): BaseLockDetails | null {
    if (/* sender is zero/empty */) return null
    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), decimals)),
        secret: BigInt(result.secret),
        sender: ..., recipient: ..., token: ...,
        timelock: Number(result.timelock),
        status: Number(result.status) as LockStatus,
    }
}
```

**Key rules for field mapping:**
- Populate every required `BaseLockDetails` field. `hashlock`, `secret`, `amount`, `sender`, `timelock`, `status`, `recipient`, and `token` are required; `amountInBaseUnits`, `refundTo`, and `payoutCurve` are optional. Use `''` for unavailable required strings, never `undefined`.
- `secret` is always `bigint` — use `BigInt(result.secret)`, no conditional check for zero
- `amount` uses `params.decimals` directly — no fallback like `?? 18`
- `LockStatus` values: `Empty(0)`, `Pending(1)`, `Refunded(2)`, `Redeemed(3)`

### getSolverLockDetails — Count-Then-Loop Pattern

Each chain's `getSolverLockDetails.ts` file contains the async function, a `getSolverLockByIndex` helper, and an exported `resolveSolverLock()` pure function:

```ts
// getSolverLockDetails delegates to getSolverLockByIndex in a loop
async function getSolverLockDetails(params, nodeUrl) { /* count-then-loop */ }

// getSolverLockByIndex fetches one lock and calls resolveSolverLock
async function getSolverLockByIndex(params, index, nodeUrl) { /* RPC + resolve */ }

// Pure function — exported for unit testing
export function resolveSolverLock(result, id, decimals, index): SolverLockDetails | null { /* field mapping */ }
```

The count-then-loop pattern:
1. Get the count of solver locks for this hashlock
2. Loop from 1 to count (**1-indexed, NOT 0-indexed**)
3. Call `getSolverLockByIndex` which calls `resolveSolverLock` internally
4. Skip nulls (empty/invalid slots handled by `resolveSolverLock`)
5. Filter by solver address (case-insensitive) if provided
6. Return first match

**`resolveSolverLock` must be an exported pure function** — enables direct unit testing:
```ts
export function resolveSolverLock(result: any, id: string, decimals: number, index: number): SolverLockDetails | null {
    if (/* sender is zero/empty */) return null
    return {
        hashlock: id,
        amount: Number(formatUnits(BigInt(result.amount), decimals)),
        amountInBaseUnits: BigInt(result.amount),
        secret: BigInt(result.secret),
        sender: ..., recipient: ..., token: ...,
        timelock: Number(result.timelock),
        status: Number(result.status) as LockStatus,
        reward: Number(result.reward),
        rewardTimelock: Number(result.rewardTimelock),
        rewardRecipient: ..., rewardToken: ...,
        index,
    }
}
```

Key points:
- **1-indexed** — contract indices start at 1
- **All required `BaseLockDetails` fields must be populated** — `secret` is always `bigint`, and required strings are never `undefined`. `Reward` fields and `refundTo` / `payoutCurve` are optional in the shared types, although the current solver resolvers populate all reward fields.
- **Always include `amountInBaseUnits: BigInt(result.amount)`** — the exact on-chain amount is required for irreversible safety checks and cross-node amount comparison
- **Include `index`** in the returned `SolverLockDetails`
- **Use `params.decimals` directly** — no `?? 18` fallback
- Normalize `reward` according to the chain ABI's units. Current Starknet/Solana/Aztec resolvers call `formatUnits(..., decimals)`; EVM/Tron currently return `Number(result.reward)` directly.

### recoverSwap

**Validate the `txHash` format at the top of the function before making any RPC calls.** New integrations should throw `new InvalidTxHashError()` (from `@train-protocol/sdk`). Existing EVM and Tron do so; Starknet, Solana, and Aztec currently throw a plain `Error('Invalid transaction hash format')`. Each chain's current format is:

- EVM: `/^0x[a-fA-F0-9]{64}$/`
- Tron: `/^[a-fA-F0-9]{64}$/` (no `0x` prefix)
- Starknet / Aztec: `/^0x[a-fA-F0-9]{1,64}$/`
- Solana: `/^[1-9A-HJ-NP-Za-km-z]{43,88}$/`

Then fetch the chain's receipt/transaction events, extract the hashlock and token address, and delegate to `getUserLockDetails` with `txId: txHash`. EVM, Tron, and Starknet require the event token to exist in `network.tokens`; current Solana and Aztec fall back to 9 and 18 decimals respectively when it does not. Do not copy those fallbacks into a new integration: a missing token match should fail recovery rather than risk scaling the amount with incorrect decimals. If the event is absent or `getUserLockDetails` returns null, throw.

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
- **New integrations should wrap RPC failures in try/catch returning `null`** — this runs in a polling loop. EVM, Starknet, Tron, and Aztec do this; Solana currently lets `getTransaction` / `getSignatureStatuses` errors propagate.
- **Must distinguish all three statuses** — `Pending`, `Confirmed`, `Failed`. Binary mappings (e.g., only Failed/Confirmed) cause incorrect early signals
- **Must be non-blocking** — do not use methods that wait for finalization (e.g., Fuel's `waitForResult`). If the chain SDK has no non-blocking alternative, document the limitation
- **Avoid unnecessary RPC calls** — do not fetch block data for `blockTimestamp` if the polling consumer only needs `status`. Keep it minimal
- **Do not fetch `blockTimestamp` by default** — only include it if the chain returns it alongside the receipt at no extra cost

---

## 7. index.ts — Registration & Exports

Registration goes through the `TrainSDK` / `TrainAuth` **instances** (not free functions). `register{Chain}Sdk` accepts optional instances for testing isolation and defaults to the shared singletons. Idempotency comes from `Map.set` — no boolean guard needed. Because `types.ts` augments `HTLCPublicClientConfigMap`, `HTLCWalletClientConfigMap`, `HTLCTransactionRequestMap`, and `WalletSignConfigMap`, the factory callbacks receive fully-typed configs — no `as` casts needed.

```ts
import { type TrainSDK, defaultTrainSDK } from '@train-protocol/sdk'
import { type TrainAuth, defaultTrainAuth } from '@train-protocol/auth'
import { {Chain}HTLCPublicClient, {Chain}HTLCWalletClient } from './client/index.js'
import { deriveKeyFrom{Chain}Wallet } from './login/index.js'

/**
 * Explicitly register the {Chain} HTLC client and wallet-sign factories.
 * Call once at app startup. Safe to call multiple times (idempotent via Map.set).
 */
export function register{Chain}Sdk(sdk?: TrainSDK, auth?: TrainAuth): void {
    const s = sdk ?? defaultTrainSDK
    const a = auth ?? defaultTrainAuth

    s.registerHTLCPublicClient('{namespace}', (config) => new {Chain}HTLCPublicClient(config))
    s.registerHTLCWalletClient('{namespace}', (config) => new {Chain}HTLCWalletClient(config))

    a.registerWalletSign('{namespace}', async (config) => {
        return deriveKeyFrom{Chain}Wallet(config.wallet /* or config.provider, config.address, config.options */)
    })
}

// Public exports
export { {Chain}HTLCPublicClient, {Chain}HTLCWalletClient } from './client/index.js'
export type { {Chain}HTLCPublicClientConfig, {Chain}HTLCWalletClientConfig, {Chain}Signer, {Chain}TransactionRequest } from './types.js'
export { deriveKeyFrom{Chain}Wallet } from './login/index.js'
export type { {Chain}WalletLike } from './login/index.js'
```

The `{namespace}` is the chain identifier used in the registry (e.g., `'eip155'` for EVM, `'aztec'` for Aztec). Unregistered namespaces throw `RegistrationError` at `create*` time.

### What to export

- `register{Chain}Sdk` — registration function
- `{Chain}HTLCPublicClient` — public (read-only) client class
- `{Chain}HTLCWalletClient` — wallet (write) client class
- `{Chain}HTLCPublicClientConfig` — public client config type
- `{Chain}HTLCWalletClientConfig` — wallet client config type
- `{Chain}Signer` — signer type
- `{Chain}TransactionRequest` — built, unsubmitted transaction/call type returned by builders
- `BuildApproveTxParams` — use the SDK's canonical type for new code; EVM, Starknet, and Tron currently re-export identical package-local types
- `deriveKeyFrom{Chain}...` — key derivation function
- Any chain-specific wallet interface types or utilities needed by consumers (e.g. `formatStarknetAddress`, `getEvmTypedData`)

---

## 8. Login / Key Derivation

Each chain needs a `login/wallet-sign.ts` that derives a deterministic login key. `deriveKeyMaterial` and `IDENTITY_SALT` come from **`@train-protocol/auth`** (not the SDK). Return `Uint8Array` (no Node `Buffer` — must work in the browser):

```ts
import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/auth'

export const deriveKeyFrom{Chain}Wallet = async (
    /* chain-specific wallet/provider (+ address/options if needed) */
): Promise<Uint8Array> => {
    // 1. Bind the fixed content "I am using TRAIN" using the chain's
    //    deterministic native signing mechanism.
    const signature = /* sign the message */

    // 2. Derive key material from signature
    const inputMaterial = /* signature bytes as Uint8Array */
    const identitySalt = new TextEncoder().encode(IDENTITY_SALT)
    return new Uint8Array(deriveKeyMaterial(inputMaterial, identitySalt))
}
```

Rules:
- Always use `"I am using TRAIN"` as the message content
- Always use `IDENTITY_SALT` and `deriveKeyMaterial` from `@train-protocol/auth`
- Return `Uint8Array`, build the salt with `TextEncoder`
- Define a minimal wallet/provider interface (don't import the full chain SDK for the type)

Current signing modes are not all plain-message signatures:

| Chain | Signed input |
|-------|--------------|
| EVM | EIP-712 typed data (`eth_signTypedData_v4`), after optionally switching to Mainnet/Sepolia |
| Starknet | SNIP-12-style typed data via `account.signMessage` |
| Solana | UTF-8 message bytes via `wallet.signMessage` |
| Tron | Plain message string via `wallet.signMessage` |
| Aztec | SHA-256 of the fixed message converted to `Fr`, then an auth witness created with the account as both signer and consumer |

---

## 9. Shared SDK Imports

Always import these utilities from `@train-protocol/sdk` / `@train-protocol/auth` instead of reimplementing:

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
    ConsensusResult,
} from '@train-protocol/sdk'
import type {
    UserLockDetails,
    SolverLockDetails,
    BaseLockDetails,
    EventDerivedData,
    IHTLCWalletClient,
    BuildApproveTxParams,
} from '@train-protocol/sdk'

// Typed error used by recoverSwap
import { InvalidTxHashError } from '@train-protocol/sdk'

// Key derivation — from AUTH, not the SDK
import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/auth'
```

---

## 10. Error Handling

The SDK's typed errors extend `TrainSDKError` and carry a `code`. Use the error that matches the boundary instead of introducing a new string-only error.

| Context | Pattern |
|---------|---------|
| Write operations | `try { ... } catch (error) { console.error('Error in {method}:', error); throw error }` — decode chain revert data into a readable message first when possible |
| Signer presence | Guaranteed by each wallet config type; wallet clients do not need a runtime guard |
| Invalid tx hash | New integrations: `throw new InvalidTxHashError()` at the top of `recoverSwap`; current Starknet/Solana/Aztec still throw plain `Error` |
| Lock not found | `getUserLockDetails` / `getSolverLockDetails` return `null`; `recoverSwap` throws when the event or recovered lock is missing |
| Event decoding | Wrap in try-catch, skip non-matching events silently |
| Transaction revert | Check chain-specific revert indicator, throw with method name + error |

---

## 11. Testing

Each blockchain package should alias `@train-protocol/sdk` to source in `vitest.config.ts` (all packages do except Aztec, which resolves the built workspace package):
```ts
resolve: { alias: { '@train-protocol/sdk': path.resolve(__dirname, '../../sdk/src/index.ts') } }
```

### resolveLock.test.ts — lock resolution tests (most critical, all chains)

Tests `resolveUserLock` and `resolveSolverLock` directly — imported from `../client/public/getUserLockDetails` and `../client/public/getSolverLockDetails`:

```ts
import { resolveUserLock } from '../client/public/getUserLockDetails'
import { resolveSolverLock } from '../client/public/getSolverLockDetails'

describe('{Chain} resolveUserLock', () => {
    // 1. resolves a basic user lock — check all BaseLockDetails fields
    // 2. returns null for empty/zero sender (or status=Empty for Aztec)
    // 3. formats amount with correct decimals
    // 4. maps status values correctly
})

describe('{Chain} resolveSolverLock', () => {
    // 1. resolves solver lock with reward fields, amountInBaseUnits, and index
    // 2. returns null for empty/zero sender
    // 3. includes correct index in result
})
```

### builders.test.ts — builder tests

Test `buildUserLockTx` / `buildRefundTx` / `buildRedeemSolverTx` outputs, plus `buildApproveTx` when present: encoded calldata round-trips, native vs token `value` handling, default fields, and chain-specific prepared objects. EVM/Tron/Starknet builders can be tested as pure functions; Solana/Aztec builders require controlled chain-dependency fakes.

### helpers.test.ts — pure helper functions

Test chain-specific helpers: `pickEventDerivedData`, `mapLockStatus` (Starknet), `parseSecret` (Solana/Aztec), event decoding, etc.

### register{Chain}Sdk.test.ts — registration smoke test

Verify `register{Chain}Sdk()` registers the namespace and creates clients with expected methods. Pass fresh `TrainSDK` / `TrainAuth` instances for isolation.

### Chain-specific suites where warranted

E.g. Tron `address.test.ts` (hex↔base58), Solana `idl.test.ts`, Aztec `storage.test.ts` + `recoverSwap.test.ts`.

Current suite coverage (the template above is prescriptive, not a claim that every package already has every suite):

| Chain | Existing suites |
|-------|-----------------|
| EVM | `builders`, `resolveLock` |
| Starknet | `builders`, `helpers`, `registerStarknetSdk`, `resolveLock` |
| Solana | `builders`, `helpers`, `idl`, `resolveLock` |
| Tron | `address`, `resolveLock` |
| Aztec | `helpers`, `recoverSwap`, `registerAztecSdk`, `resolveLock`, `storage` |

---

## 12. Constants

Define chain-specific constants in `constants.ts` (omit the file if the chain has none, like Aztec):

```ts
export const ZERO_ADDRESS = '0x000...' as const   // Chain's empty/zero address representation
// Chain-specific extras as needed, e.g.:
// Solana: NATIVE_SOL_ADDRESS
// Tron:   DEFAULT_FEE_LIMIT, TRON_ADDRESS_PREFIX, FUNCTION_SIGNATURES (TronGrid selector strings)
```

---

## Summary Checklist for New Chain SDK

- [ ] Create `packages/blockchains/{chain}/` with the modular directory structure above
- [ ] In `types.ts`:
  - [ ] Define `{Chain}Signer` interface (minimal — wraps the chain's signing mechanism)
  - [ ] Define `{Chain}TransactionRequest` (local interface or alias of a chain-library type)
  - [ ] Define `{Chain}HTLCPublicClientConfig` (rpcUrl + chain-specific extras) and `{Chain}HTLCWalletClientConfig` (extends public + required signer)
  - [ ] Define `{Chain}WalletSignConfig` type
  - [ ] Add `declare module` augmentations for `HTLCPublicClientConfigMap`, `HTLCWalletClientConfigMap`, `HTLCTransactionRequestMap` (SDK) and `WalletSignConfigMap` (auth)
- [ ] Implement `client/PublicClient.ts` — thin facade over `client/public/*.ts` functions
- [ ] Implement `client/WalletClient.ts` — thin facade over `client/wallet/*.ts` functions, implementing `IHTLCWalletClient<{Chain}TransactionRequest>`
- [ ] Each read method in its own file under `client/public/`:
  - [ ] `getUserLockDetails.ts` — includes exported `resolveUserLock()` plus chain-specific event extraction
  - [ ] `getSolverLockDetails.ts` — includes exported `resolveSolverLock()` (with `amountInBaseUnits`)
  - [ ] `getTransaction.ts`
  - [ ] `recoverSwap.ts`
  - [ ] `get{Standard}Allowance.ts` if the chain has token allowances (e.g. `getErc20Allowance.ts`, `getTrc20Allowance.ts`)
- [ ] Each protocol write operation split into a paired builder + executor under `client/wallet/`:
  - [ ] `userLock.ts` (executor) + `buildUserLockTx.ts` (builder)
  - [ ] `refund.ts` (executor) + `buildRefundTx.ts` (builder)
  - [ ] `redeemSolver.ts` (executor) + `buildRedeemSolverTx.ts` (builder)
  - [ ] `buildApproveTx.ts` (prefer the SDK `BuildApproveTxParams`; existing allowance packages currently duplicate the same shape locally) if the chain has token approvals
  - [ ] Expose all builders as public methods on the wallet client
- [ ] Count-then-loop pattern in `getSolverLockDetails` (1-indexed)
- [ ] `getTransaction(txHash)` — non-blocking, try/catch returning `null`, all three statuses
- [ ] Set `this.consensusOptions` in constructor if chain needs non-default quorum
- [ ] Validate `txHash` format at the top of `recoverSwap` — throw `new InvalidTxHashError()` before any RPC calls
- [ ] Shared utilities in `src/utils.ts`; constants and ABI/function definitions in `src/constants.ts` / `src/abi.ts` when applicable
- [ ] Login: `login/wallet-sign.ts` using `deriveKeyMaterial` + `IDENTITY_SALT` from `@train-protocol/auth`, returning `Uint8Array`
- [ ] Registration: `register{Chain}Sdk(sdk?: TrainSDK, auth?: TrainAuth)` in `index.ts` using `defaultTrainSDK` / `defaultTrainAuth`
- [ ] Exports: registration fn, both client classes, both config types, signer type, transaction-request type, key derivation fn
- [ ] Tests:
  - [ ] `resolveLock.test.ts` — test `resolveUserLock` + `resolveSolverLock` (imported from public files)
  - [ ] `builders.test.ts` — test builder outputs with controlled dependencies where required
  - [ ] `helpers.test.ts` — test chain-specific pure helpers when present
  - [ ] `register{Chain}Sdk.test.ts` — registration smoke test (fresh SDK/auth instances)
  - [ ] `vitest.config.ts` with SDK source alias
- [ ] Add contract ABI/artifacts in `abis/`, `artifacts/`, or `idl/` when applicable
