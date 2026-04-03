# @train-protocol/solana

Solana HTLC client for Train Protocol. Enables atomic swaps on Solana using an Anchor-based on-chain program.

## What's Inside

- **`SolanaHTLCClient`** — HTLC client implementation for Solana
- **`registerSolanaSdk()`** — registers the client under the `solana` namespace
- **`deriveKeyFromSolanaWallet()`** — derives key material from a Solana wallet signature
- **Program IDL and `TRAIN_HTLC_PROGRAM_ID`** — Anchor IDL and program address
- **Transaction builders** for constructing Solana-native instructions

## Installation

```bash
pnpm add @train-protocol/solana
```

Peer dependency: `@train-protocol/sdk`

## Usage

```ts
import { registerSolanaSdk } from "@train-protocol/solana";

registerSolanaSdk();

import { createHTLCClient } from "@train-protocol/sdk";
const client = createHTLCClient("solana", { connection, wallet });
```
