# Train Protocol

Cross-chain atomic swaps using HTLC (Hash Time-Locked Contracts). Users lock funds on a source chain, a solver locks on the destination chain, then secrets are revealed to complete the swap.

## Repository Layout

This is a pnpm monorepo.

- `apps/app` — Next.js 15 frontend (Pages Router)
- `packages/sdk` — `@train-protocol/sdk`: core HTLC protocol logic, API client, lock verification
- `packages/blockchains/{evm,solana,starknet,tron,aztec}` — chain-specific HTLC client implementations
- `packages/auth`, `packages/react` — shared auth and React utilities

## Requirements

- Node.js >= 20.9.0
- pnpm 10.20.0

## Getting Started

```bash
pnpm install
pnpm build:packages   # build SDK + chain packages
pnpm dev              # start the Next.js dev server
```

## Common Scripts

```bash
pnpm dev                          # Next.js dev server (apps/app)
pnpm build                        # build packages, then the app
pnpm build:sdk                    # build @train-protocol/sdk only
pnpm build:packages               # build all packages

pnpm --filter @train-protocol/sdk dev           # SDK watch mode
pnpm --filter @train-protocol/sdk check:types   # type-check the SDK
```

Tests use [vitest](https://vitest.dev/) — run `pnpm test` inside any package.

## Environment Variables

Set the following in `apps/app/.env.local`:

```
NEXT_PUBLIC_TRAIN_API                  # Station API base URL
NEXT_PUBLIC_API_VERSION                # "sandbox" or "mainnet"
NEXT_PUBLIC_ALCHEMY_KEY                # for light-client RPC calls
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID  # WalletConnect project id
```

## How a Swap Works

1. `userLock()` — user locks funds with a hashlock on the source chain
2. The protocol polls `getSolverLock` until the solver locks on the destination chain
3. The user reveals the secret to the solver via the Station API
4. The solver redeems on the destination, then on the source — swap complete

## License

[MIT](./LICENSE) © TRAIN Protocol
