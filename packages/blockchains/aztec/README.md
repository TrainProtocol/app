# @train-protocol/aztec

Aztec HTLC client for Train Protocol. Enables privacy-preserving atomic swaps on the Aztec network using Noir smart contracts.

## What's Inside

- **`AztecHTLCClient`** — HTLC client implementation for Aztec
- **`registerAztecSdk()`** — registers the client under the `aztec` namespace
- **`deriveKeyFromAztecWallet()`** — derives key material from an Aztec wallet

## Installation

```bash
pnpm add @train-protocol/aztec
```

Peer dependency: `@train-protocol/sdk`

## Usage

```ts
import { registerAztecSdk } from "@train-protocol/aztec";

registerAztecSdk();

import { createHTLCClient } from "@train-protocol/sdk";
const client = createHTLCClient("aztec", { wallet, pxe });
```
