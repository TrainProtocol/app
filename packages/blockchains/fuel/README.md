# @train-protocol/fuel

Fuel HTLC client for Train Protocol. Enables atomic swaps on the Fuel execution layer.

> **Note:** This package is currently private and under development.

## What's Inside

- **`FuelHTLCClient`** — HTLC client implementation for Fuel
- **`registerFuelSdk()`** — registers the client under the `fuel` namespace
- **`deriveKeyFromFuelWallet()`** — derives key material from a Fuel wallet

## Installation

```bash
pnpm add @train-protocol/fuel
```

Peer dependency: `@train-protocol/sdk`

## Usage

```ts
import { registerFuelSdk } from "@train-protocol/fuel";

registerFuelSdk();

import { createHTLCClient } from "@train-protocol/sdk";
const client = createHTLCClient("fuel", { wallet, provider });
```
