# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
pnpm dev                              # Start Next.js dev server (apps/app)
pnpm build                            # Build all packages first, then the app
pnpm build:sdk                        # Build @train-protocol/sdk only
pnpm build:packages                   # Build all workspace packages
pnpm --filter train-app build:workers # Compile worker bundles (tsconfig.worker.json)

# SDK development
pnpm --filter @train-protocol/sdk dev          # Watch mode for SDK
pnpm --filter @train-protocol/sdk check:types  # Type-check SDK
```

The app has no `lint` script and no in-app test setup — tests live in packages (vitest), notably `packages/sdk` (`pnpm --filter @train-protocol/sdk test`). Node.js >=20.9.0 required. Package manager: pnpm 10.20.0.

## Architecture

**Monorepo** (pnpm workspaces — `apps/*` and `packages/**`):
- `apps/app` — Next.js 16.3 frontend (App Router, Turbopack). Entry: `app/layout.tsx` (server, awaits `getSettings()`) → `app/providers.tsx` (consolidated client providers). The provider tree is split: outer (SWR, Theme, Intercom, Vercel Analytics) and inner `AppShell` (Settings, Tooltip, Train, Wallets, Faro tracking, ThemeWrapper, ErrorBoundary, SwapAccounts, AsyncModal). The persistent shell (`ThemeWrapper` — sidebar/navbar/footer) is rendered *above* the Suspense boundary so it never blanks. Only `<QueryProvider>` (which reads `useSearchParams` internally) plus `AuthDialog`, `SwapModalRoot`, and the page `children` sit inside `<Suspense fallback={<Loading />}>`. Route segments: `app/{page,swap,settings,transactions,nocookies}/page.tsx`. Root `error.tsx` + `not-found.tsx`. `proxy.ts` (the Next 16 rename of `middleware.ts` — exports `proxy`, not `middleware`) sets `Cache-Control: public, s-maxage=60, stale-while-revalidate`. The layout is no longer `force-dynamic` — `getSettings` is cached via `unstable_cache` (60s revalidate) and all routes build as `○ Static`. Sidebar `<Link>`s use Next's default prefetch (eager prefetch on viewport entry for static routes); the logo opts out via `prefetch={false}` since it points at `/`. All four sidebar nav targets (logo, Home, History, Settings) preserve persistent embed query params via `buildHrefWithPersistantParams`. Web Workers live in `apps/app/workers/` (e.g. `helios` light client) and are built via `build:workers`.
- `packages/sdk` — `@train-protocol/sdk`: core HTLC protocol logic, `TrainApiClient`, lock verification, consensus helpers (vitest tests in `__tests__/`).
- `packages/blockchains/` — chain-specific HTLC client implementations: `evm`, `solana`, `starknet`, `tron`, `aztec`, `fuel`, plus shared `utils`.
- `packages/auth` — `@train-protocol/auth` shared auth helpers.
- `packages/react` — `@train-protocol/react` shared React utilities.

**What the app does**: Cross-chain atomic swaps using HTLC (Hash Time-Locked Contracts). Users lock funds on a source chain, a solver locks on the destination chain, then secrets are revealed to complete the swap. EVM is the primary chain; Solana, Starknet, TON, Aztec, Tron, and Fuel support is in progress (see `FUEL_PHTLC.json`).

### State Management
- **Zustand stores** (`apps/app/stores/`): `swapStore` (main swap state), `walletStore` and `aztecWalletStore` (app-owned Aztec integration), `addressesStore`, `balanceStore`, `rpcConfigStore`, `authDialogStore`, `faucetNudgeStore`, `recentRoutesStore`, `routeSortingStore`, `routeTokenSwitchStore`, and `usdModeStore`. Package-owned wallet state lives in the corresponding `@layerswap/wallet-*` package rather than app stores. There is no `secretDerivationStore` — secret derivation lives in helpers/components.
- **React Context** (`apps/app/context/`): `swapAccounts` (wallet/account handling), `formWizardProvider` (multi-step forms), `query` (React Query), `settings`, `snapPointsContext`, and `asyncModal`. Wallet connection state is supplied by the Layerswap registry/provider tree; HTLC clients are registered separately through `WalletBridges`.

### Wallet packages and Train bridges
- Published `@layerswap/*` packages provide shared wallet connection state and UI. This branch consumes local packed builds from `local-packages/*.tgz`, pinned by root `pnpm.overrides` while the package changes are under development.
- `components/WalletProviders/LayerswapRegistry.tsx` registers raw Train `ExtendedNetwork[]` with wallet-core through `walletNetworkAdapter`. Train keeps CAIP-2 IDs as its network identity; wallet packages must use the adapter rather than Layerswap internal network names.
- EVM is initialized eagerly with the app's external wagmi config. Fuel, Solana, Starknet, and Tron are descriptor-based providers loaded only when needed or when a persisted session exists.
- Aztec remains app-owned because there is no Layerswap Aztec wallet package. `lib/wallets/aztec/adapter.tsx` adapts the React/context integration into wallet-core's external-store contract.
- `components/WalletBridges/*` is the boundary from connected wallet state to `@train-protocol/react`: each bridge registers the chain's public/write HTLC client and login signer. Non-EVM bridges mount only after their lazy wallet provider is ready.
- `components/WalletModal/*` hosts the app drawer/dialog while `@layerswap/ui-kit` owns the connector flow UI. `components/Wallet/walletListAdapters.tsx` supplies Train-specific CAIP-2 IDs, balances, labels, and connect behavior to UI-kit components.
- Layerswap package `ErrorHandler` events are wired to Grafana Faro in `app/providers.tsx`.

### Layout & navigation
- `ThemeWrapper` (inside providers) renders the persistent shell: left-side `AppSidebar` + top app-header strip (desktop) that holds `<PendingSwap />` + content area + `GlobalFooter`.
- `HeaderWithMenu` lives inside `Widget` (not the app shell) and contains back button, mobile-only wallet/menu cluster. On mobile `PendingSwap` also appears here (no top app-header on mobile).
- **Route loading skeletons**: `components/Loading.tsx` is the single spinner (`flex items-center justify-center w-full min-h-[80svh]` wrapper around `<Loader className="h-10 w-10 text-primary-text animate-spin" />`), used both for non-route Suspense boundaries and by every route fallback. `app/{settings,transactions,swap,faucet}/loading.tsx` are one-line re-exports (`export { default } from "@/components/Loading"`). Add a new route fallback the same way; only inline a body if that route genuinely needs a different skeleton.
- **Maintenance fallback**: when `getSettings()` returns `null`, `app/providers.tsx` renders `<MaintananceContent />` in place of the full provider tree (inside `IntercomProvider` so `useIntercom` works). Root layout does NOT call `notFound()`.

### API Layer — Station API
`TrainApiClient` is imported directly from `@train-protocol/sdk` (no app-side wrapper). Server-side instantiation lives in `apps/app/lib/getSettings.ts` (cached via `unstable_cache`). Uses SSE for streaming:
- `GET /api/v1/quote/stream` — quote streaming (events: `quote`, `done`)
- `GET /api/v1/orders/{hashlock}/stream?solverAddress=0x...` — order status streaming
- `POST /api/v1/orders/{hashlock}/reveal-secret?solverAddress=0x...` — reveal secret to solver
- `GET /api/v1/networks` — network/token metadata
- `GET /api/v1/prices` — token price data
- `sourceNetwork` param must be a CAIP-2 ID (e.g. `"eip155:11155111"`)

### HTLC / Atomic Swap Flow
1. `userLock()` — user locks funds with hashlock on source chain (single-step, no separate commit)
2. Poll `getSolverLock(hashlock, solverAddress)` — wait for the quoted solver to lock on the destination chain
3. **Auto-reveal** — once solver-lock verification (against the original quote) and multi-RPC consensus pass, the secret is revealed automatically via the API (`RevealSecret`). No user click; manual `RevealSecretAction` button and the `swapPreferencesStore.autoRevealSecret` toggle have been removed. When verification is `skipped` (no on-chain `dstAmount` to compare against), reveal still proceeds, but `SolverLockDetectedAction` shows a "Verification skipped — proceeding with caution" banner. On reveal failure, a "Try again" button is rendered.
4. Swap complete when solver redeems

Key files:
- `apps/app/lib/abis/atomic/EVM_HTLC.json` — unified EVM ABI
- `apps/app/lib/abis/atomic/FUEL_PHTLC.json` — Fuel PHTLC ABI
- `packages/blockchains/{evm,solana,starknet,tron,aztec}/src/client/` — chain-specific HTLC implementations (PublicClient + WalletClient)
- `apps/app/lib/wallets/layerswap/` — Layerswap provider descriptors plus the Train network adapter
- `apps/app/components/WalletBridges/` — per-chain adapters from connected wallets to `@train-protocol/react` HTLC clients
- `apps/app/lib/wallets/aztec/` — app-owned Aztec connection integration and wallet-core adapter

### RPC Node Resolution & Consensus
- `apps/app/lib/rpc/` — RPC resolution: `nodeResolver.ts` (entry point), `evmNodes.ts` (static chainlist data from `data/chainlistRpcs.json`), `nonEvmNodes.ts` (static registry)
- `resolveNodes(caip2Id)` returns all available RPCs (existing nodes first, then dynamic/static). Called server-side in `getSettings.ts`
- `rpcConfigStore` manages user custom RPC overrides; `getEffectiveRpcUrls(network)` returns custom URLs or `network.nodes`
- **Consensus verification**: `getSolverLockDetailsWithConsensus()` in SDK queries nodes in batches of `batchSize` (default 3), retries with next batch if quorum (`minQuorum`, default 2) not met. Returns `ConsensusResult { details, agreedCount } | null` (the `agreedCount` is the number of nodes that agreed on the lock data).
- `ConsensusOptions`: `{ minQuorum?: number, batchSize?: number }` — configurable per-call or via subclass defaults
- Consensus runs once on first solver lock detection (tracked by `consensusVerified` ref in `useSolverLockPolling`), then falls back to single-node polling. The hook also tracks `verifiedNodeCount` (=1 on the single-node fast path, =`agreedCount` after multi-node consensus) and writes it to swap flags so the `VerificationStatus` UI can render "Verified by N RPCs" accurately.

### Secret & Nonce
- Secret derived from: `deriveInitialKey()` + `deriveSecretFromTimelock(key, nonce)`
- Nonce = `Date.now()` timestamp, stored in URL query params (for page refresh recovery) and on-chain via `userData` bytes field

### Web3 Stack
- EVM: `@layerswap/wallet-evm` with the app's wagmi 2.14 + viem 2.44 config
- Starknet: `@layerswap/wallet-starknet`; HTLC implementation uses starknet.js 8.x
- Solana: `@layerswap/wallet-svm`; HTLC implementation uses `@solana/web3.js` 1.98 + Anchor
- Tron: `@layerswap/wallet-tron`
- Fuel: `@layerswap/wallet-fuel` + fuels 0.101
- Aztec: app-owned `@aztec/aztec.js` 5.1 + `@aztec/wallet-sdk` 5.1 integration
- Shared connection UI/state: `@layerswap/ui-kit`, `@layerswap/wallet-core`, `@layerswap/utils`, and `@layerswap/widget-types`

## Key Conventions

- Code uses legacy "commit" naming (`CommitStatus`, `commitId`) — these refer to **locks**, not a separate commit step
- `hashlock === commitId` — always present from lock creation, never null
- Use `status` field (not `claimed`) for lock state: `Pending(0)`, `Redeemed(1)`, `Refunded(2)` — there is no `Completed(3)`
- `solver` in swapStore is a solverId string (e.g. `"plorex"`), not a wallet address
- For destination chain polling, use `getSolverLock` (not `getUserLock`)
- Contract functions: `userLock`/`redeemUser`/`refundUser`/`getUserLock` + `solverLock`/`redeemSolver`/`getSolverLock`
- **Solver locks are keyed by `(hashlock, solver address)`** — `getSolverLock`/`redeemSolver`/`refundSolver` all take the solver address as their second argument. There is no lock index and no `getSolverLockCount`, so reading a solver lock is a single keyed call (`LockParams.solverAddress` is required) rather than a count-then-loop. On `SolverLockDetails` the owning solver is the `sender` field; `RedeemSolverParams.solverAddress` carries it into the redeem builders.
- **Active swap modal**: the `VaulDrawer` that reads `useSwapStore.swapModalOpen` is mounted only inside `Swap/Atomic/index.tsx`, which renders on `/` only. Setting `swapModalOpen=true` from `/transactions` / `/settings` flips the flag but nothing opens. To open the active swap from any path, navigate to `/swap?sourceNetwork=X&txHash=Y` (see `handleViewSwap` in `SwapDetailsPanel` and `handleClick` in `PendingSwap`); `/swap` routes through `useRecoverSwap` to rehydrate the active hashlock.
- **`useSearchParams` placement**: callback-only reads (e.g. `useGoHome`, `useMenuNavigation.handleRecoverSwap`, `Widget.goBack` via `window.location.search`) are fine anywhere. Render-time reads need a `<Suspense>` boundary, otherwise Next.js opts the segment out of static prerender. The single render-time `useSearchParams` in the provider tree lives inside `QueryProvider` (`context/query.tsx`), which is wrapped in `<Suspense fallback={null}>` in `providers.tsx`. Sidebar/navbar/`useOptionalSecretDerivation` consumers do **not** read URL, so the shell renders above that boundary. New components that read URL at render time should consume `useQueryState()` (already inside the Suspense island via `QueryProvider`) rather than calling `useSearchParams` directly.
- **Persistent query params**: `buildHrefWithPersistantParams(pathname, searchParams, extraParams?)` (in `helpers/querryHelper.ts`) preserves keys defined in `Models/QueryParams` (widget embed params like `appName`, `hideLogo`, `lockNetwork`, etc.) across navigations. Use it for any programmatic `router.push` that should keep the embed state intact.

## Environment Variables

```
NEXT_PUBLIC_TRAIN_API                  # Station API base URL (required)
NEXT_PUBLIC_API_VERSION                # "sandbox" or "mainnet"
NEXT_PUBLIC_ALCHEMY_KEY                # For light client RPC calls
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID  # WalletConnect
NEXT_PUBLIC_FARO_COLLECTOR_URL         # Grafana Faro collector URL (telemetry disabled when unset)
NEXT_PUBLIC_FARO_SAMPLE_RATE           # Faro session sampling rate, 0..1 (default 1)
NEXT_PUBLIC_VERCEL_ENV                 # Vercel env (production/preview/development)
NEXT_PUBLIC_VERCEL_URL                 # Vercel deployment URL
```
