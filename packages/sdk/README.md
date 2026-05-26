# @train-protocol/sdk

Core SDK for the Train Protocol — provides HTLC (Hash Time-Locked Contract) logic, API client, cryptographic key derivation, and verification utilities for cross-chain atomic swaps.

## Setup

```ts
import { TrainApiClient } from '@train-protocol/sdk'

const apiClient = new TrainApiClient({ baseUrl: 'https://api.train.protocol' })
```

Chain-specific HTLC clients (EVM, Solana, Starknet, etc.) are registered via the plugin registry by their respective packages (e.g. `@train-protocol/evm`).

## Architecture

```
@train-protocol/sdk
├── api/            — TrainApiClient (Station API wrapper)
├── types/          — Core types (LockDetails, HTLCStatus, Network, Token, params)
├── verification/   — Solver lock verification + HTLC status resolution
├── registry/       — Plugin system for chain-specific HTLC clients & wallet signers
├── login/          — Passkey (WebAuthn/PRF) and wallet-based key derivation
└── utils/          — Amount parsing (parseUnits/formatUnits) and hex conversion
```

## Exports

### API Client

| Export | Description |
| --- | --- |
| `TrainApiClient` | HTTP client for Station API (networks, quotes, orders, prices, secret reveal) |
| `TrainApiClientConfig` | Config type (`{ baseUrl: string }`) |
| API response types | `HTLCFromApi`, `HTLCFromApiResponse`, `SolverQuote`, `QuoteDetails`, `AggregatedQuoteResponse`, `OrderStreamEvent`, etc. |

### Types

| Export | Description |
| --- | --- |
| `LockStatus` | Enum: `Empty`, `Pending`, `Refunded`, `Redeemed` |
| `HTLCStatus` | Enum: `Initial`, `UserLocked`, `SolverLockDetected`, `SecretRevealed`, `ManualClaimRequired`, `RedeemCompleted`, `TimelockExpired`, `Refunded` |
| `LockDetails` | On-chain lock metadata (sender, recipient, amount, hashlock, timelock, secret, status) |
| `Network` / `Token` | Network and token models with metadata, nodes, contracts |
| `IHTLCClient` | Interface for chain-specific HTLC operations |
| `HTLCClient` | Abstract base class with shared multi-node verification and secret reveal logic |
| `UserLockParams`, `LockParams`, `RefundParams`, `RedeemSolverParams` | Function parameter types |
| `AtomicResult`, `RecoveredSwapData` | Transaction result types |
| `isTerminalStatus`, `TERMINAL_STATUSES` | Status helpers |

### Verification

| Export | Description |
| --- | --- |
| `verifySolverLock()` | Validates solver lock details (amount, recipient, token) against expected values |
| `resolveHTLCStatus()` | Resolves current `HTLCStatus` from source/solver lock states and flags |

### Registry (Plugin System)

| Export | Description |
| --- | --- |
| `registerHTLCClient(namespace, factory)` | Register a chain-specific HTLC client factory (e.g. `'eip155'`) |
| `createHTLCClient(namespace, config)` | Create an HTLC client instance via registered factory |
| `registerWalletSign(provider, factory)` | Register a wallet signature derivation factory |
| `deriveKeyFromWallet(provider, config)` | Derive key material via wallet signature |

### Key Derivation & Passkey

| Export | Description |
| --- | --- |
| `deriveKeyMaterial(ikm, salt)` | HKDF-SHA256 key derivation |
| `deriveSecretFromTimelock(key, nonce)` | Derive swap secret from initial key + timelock nonce |
| `secretToHashlock(secret)` | SHA256 hash of secret to produce hashlock |
| `registerPasskey()` | Create WebAuthn passkey with optional PRF support |
| `deriveKeyWithPasskey()` | Authenticate with passkey and derive key via PRF |
| `checkPrfSupport()` | Detect WebAuthn PRF extension support |

### Utilities

| Export | Description |
| --- | --- |
| `parseUnits(value, decimals)` | String amount to bigint (e.g. `"1.5"` with 18 decimals) |
| `formatUnits(value, decimals)` | bigint to string amount |
| `hexToBytes(hex)` / `bytesToHex(bytes)` | Hex-byte array conversion |
| `toHex32(value)` | bigint to 0x-prefixed 32-byte hex string |

## HTLC Swap Flow

1. **User locks** funds on source chain via `IHTLCClient.userLock()`
2. **Solver locks** on destination chain — verified via `verifySolverLock()` + `IHTLCClient.getSolverLockDetails()`
3. **Secret revealed** to solver via `TrainApiClient.revealSecret()`
4. **Solver redeems** on both chains — swap complete when status is `RedeemCompleted`
5. **Refund** available via `IHTLCClient.refund()` if timelock expires before completion

## Key Concepts

- **hashlock** = `commitId` — unique swap identifier derived from the secret
- **Secret** — derived from passkey or wallet signature + timelock nonce
- **Chain namespace** — CAIP-2 prefix (e.g. `eip155`, `solana`, `starknet`) used for registry lookups
- **LockStatus** tracks individual lock state; **HTLCStatus** tracks the full swap lifecycle
