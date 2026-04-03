# @train-protocol/auth

Authentication module for Train Protocol. Handles WebAuthn/passkey-based login and a wallet-sign registry that lets each blockchain provide its own key derivation method.

## What's Inside

- **Passkey management** — `InMemoryPasskeyStorage` and related types for WebAuthn credential handling
- **Key derivation** — functions for deriving cryptographic keys from passkey assertions
- **Wallet-sign registry** — `registerWalletSign` / `WalletSignConfigMap` for type-safe, chain-specific signing

## Installation

```bash
pnpm add @train-protocol/auth
```

Peer dependency: `@noble/hashes`

## Usage

```ts
import { InMemoryPasskeyStorage, registerWalletSign } from "@train-protocol/auth";

// Register a chain-specific wallet signer
registerWalletSign("eip155", evmSignConfig);

// Use passkey storage for WebAuthn flows
const storage = new InMemoryPasskeyStorage();
```
