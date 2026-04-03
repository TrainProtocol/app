# @train-protocol/ton

TON HTLC client for Train Protocol. Enables atomic swaps on the TON blockchain using its message-based contract architecture.

## What's Inside

- **`TonHTLCClient`** — HTLC client implementation for TON
- **`registerTonSdk()`** — registers the client under the `ton` namespace
- **`deriveKeyFromTonWallet()`** — derives key material from a TON wallet

## Installation

```bash
pnpm add @train-protocol/ton
```

Peer dependency: `@train-protocol/sdk`

## Usage

```ts
import { registerTonSdk } from "@train-protocol/ton";

registerTonSdk();

import { createHTLCClient } from "@train-protocol/sdk";
const client = createHTLCClient("ton", { sender, tonClient });
```
