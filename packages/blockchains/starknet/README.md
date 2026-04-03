# @train-protocol/starknet

Starknet HTLC client for Train Protocol. Enables atomic swaps on Starknet (Cairo-based L2 on Ethereum).

## What's Inside

- **`StarknetHTLCClient`** — HTLC client implementation for Starknet
- **`registerStarknetSdk()`** — registers the client under the `starknet` namespace
- **`deriveKeyFromStarknetWallet()`** — derives key material from a Starknet wallet signature
- **Address utilities** for Starknet-specific formatting

## Installation

```bash
pnpm add @train-protocol/starknet
```

Peer dependency: `@train-protocol/sdk`

## Usage

```ts
import { registerStarknetSdk } from "@train-protocol/starknet";

registerStarknetSdk();

import { createHTLCClient } from "@train-protocol/sdk";
const client = createHTLCClient("starknet", { account, provider });
```
