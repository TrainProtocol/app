# @train-protocol/sdk-evm

EVM (eip155) HTLC client and wallet-sign provider for the Train Protocol SDK.

## Setup

Call `registerEvmSdk()` once at app startup **before** using any EVM HTLC or wallet-sign features:

```ts
import { registerEvmSdk } from '@train-protocol/sdk-evm'

registerEvmSdk() // idempotent — safe to call more than once
```

This registers:

- **HTLC client factory** for the `eip155` chain namespace (`createHTLCClient('eip155', ...)`)
- **Wallet-sign factory** for EVM wallets (`deriveKeyFromWallet('eip155', ...)`)

## Exports

| Export                      | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `registerEvmSdk()`         | Register EVM providers (call once at startup)  |
| `EvmHTLCClient`            | EVM HTLC client class                          |
| `deriveKeyFromEvmSignature` | Derive key from EVM wallet signature           |
| `getEvmTypedData`          | Get EIP-712 typed data for signing             |
| `EvmSigner` (type)         | Signer interface for write operations          |
| `Eip1193Provider` (type)   | EIP-1193 provider interface                    |
