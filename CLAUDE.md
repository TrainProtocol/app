# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
pnpm dev              # Start Next.js dev server (apps/app)
pnpm build            # Build SDK packages first, then the app
pnpm build:sdk        # Build @train-protocol/sdk only
pnpm build:packages   # Build all packages
pnpm --filter train-app lint  # ESLint (next lint on apps/app)

# SDK development
pnpm --filter @train-protocol/sdk dev    # Watch mode for SDK
pnpm --filter @train-protocol/sdk check:types  # Type-check SDK
```

No test runner is configured. Node.js >=20.9.0 required. Package manager: pnpm 10.20.0.

## Architecture

**Monorepo** (pnpm workspaces):
- `apps/app` — Next.js 15 frontend (Pages Router, not App Router)
- `packages/sdk` — `@train-protocol/sdk`: core HTLC protocol logic, API client, lock verification
- `packages/blockchains/` — chain-specific HTLC client implementations (`evm`, `solana`, `starknet`, `aztec`)

**What the app does**: Cross-chain atomic swaps using HTLC (Hash Time-Locked Contracts). Users lock funds on a source chain, a solver locks on the destination chain, then secrets are revealed to complete the swap. EVM is the primary chain; Solana, Starknet, TON, Aztec support is in progress.

### State Management
- **Zustand stores** (`apps/app/stores/`): `swapStore` (main swap state), `secretDerivationStore`, `balanceStore`, `walletStore`, `rpcConfigStore`, etc.
- **React Context** (`apps/app/context/`): `atomicContext` (HTLC contract interactions), `secretDerivationContext`, `swapAccounts` (wallet/account handling), `formWizardProvider` (multi-step forms), `evmConnectorsContext`

### API Layer — Station API
`apps/app/lib/trainApiClient.ts` is a thin wrapper delegating to `@train-protocol/sdk`'s `TrainApiClient`. Uses SSE for streaming:
- `GET /api/v1/quote/stream` — quote streaming (events: `quote`, `done`)
- `GET /api/v1/orders/{solverId}/{hashlock}/stream` — order status streaming
- `POST /api/v1/orders/{solverId}/{hashlock}/reveal-secret` — reveal secret to solver
- `GET /api/v1/networks` — network/token metadata
- `sourceNetwork` param must be a CAIP-2 ID (e.g. `"eip155:11155111"`)

### HTLC / Atomic Swap Flow
1. `userLock()` — user locks funds with hashlock on source chain (single-step, no separate commit)
2. Poll `getSolverLock` — wait for solver to lock on destination chain
3. Reveal secret via API (`RevealSecret`) — solver claims on destination then source
4. Swap complete when solver redeems

Key files:
- `apps/app/lib/abis/atomic/EVM_HTLC.json` — unified EVM ABI
- `apps/app/lib/htlc/` — HTLC client creation
- `packages/blockchains/{evm,solana,starknet,aztec}/src/client.ts` — chain-specific HTLC implementations
- `apps/app/lib/wallets/utils/atomicTypes.ts` — chain-specific wallet/atomic interfaces

### RPC Node Resolution & Consensus
- `apps/app/lib/rpc/` — RPC resolution: `nodeResolver.ts` (entry point), `evmNodes.ts` (static chainlist data from `data/chainlistRpcs.json`), `nonEvmNodes.ts` (static registry)
- `resolveNodes(caip2Id)` returns all available RPCs (existing nodes first, then dynamic/static). Called server-side in `getSettings.ts`
- `rpcConfigStore` manages user custom RPC overrides; `getEffectiveRpcUrls(network)` returns custom URLs or `network.nodes`
- **Consensus verification**: `getSolverLockDetailsWithConsensus()` in SDK queries nodes in batches of `batchSize` (default 3), retries with next batch if quorum (`minQuorum`, default 2) not met
- `ConsensusOptions`: `{ minQuorum?: number, batchSize?: number }` — configurable per-call or via subclass defaults
- Consensus runs once on first solver lock detection (tracked by `consensusVerified` ref in `useSolverLockPolling`), then falls back to single-node polling

### Secret & Nonce
- Secret derived from: `deriveInitialKey()` + `deriveSecretFromTimelock(key, nonce)`
- Nonce = `Date.now()` timestamp, stored in URL query params (for page refresh recovery) and on-chain via `userData` bytes field

### Web3 Stack
- EVM: wagmi 2.x + viem 2.x
- Starknet: @starknet-react 5.x + starknet.js
- Solana: @solana/web3.js + wallet-adapter
- TON: @ton/ton + @tonconnect/ui-react

## Key Conventions

- Code uses legacy "commit" naming (`CommitStatus`, `commitId`) — these refer to **locks**, not a separate commit step
- `hashlock === commitId` — always present from lock creation, never null
- Use `status` field (not `claimed`) for lock state: `Pending(0)`, `Redeemed(1)`, `Refunded(2)` — there is no `Completed(3)`
- `solver` in swapStore is a solverId string (e.g. `"plorex"`), not a wallet address
- For destination chain polling, use `getSolverLock` (not `getUserLock`)
- Contract functions: `userLock`/`redeemUser`/`refundUser`/`getUserLock` + `solverLock`/`redeemSolver`/`getSolverLock`

## Environment Variables

```
NEXT_PUBLIC_TRAIN_API         # Station API base URL
NEXT_PUBLIC_API_VERSION       # "sandbox" or "mainnet"
NEXT_PUBLIC_ALCHEMY_KEY       # For light client RPC calls
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID  # WalletConnect
```
