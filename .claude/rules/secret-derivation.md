# Secret Derivation & Hashlock Rules

Rules for working with the secret derivation system. Violations can lock user funds permanently.

---

## 1. NEVER Change the Derivation Scheme

The secret derivation chain determines the hashlock used to lock funds on-chain:

```
raw key bytes → createProtectedKey() → CryptoKey (non-extractable)
CryptoKey + nonce → deriveSecretFromCryptoKey() → secret → SHA256 → hashlock
```

**If the derivation output changes, existing on-chain locks become unredeemable.**

Do NOT:
- Change the HKDF parameters (hash algorithm, info string, output length) in `deriveSecretFromCryptoKey`
- Change the salt derivation from the timelock nonce (the `timelockToSalt` logic)
- Add, remove, or reorder HKDF steps in the derivation chain
- Change `secretToHashlock` (SHA-256 of the secret)

If a derivation scheme change is intentional (e.g. protocol upgrade), it must be:
1. Explicitly approved and documented
2. Versioned so old secrets can still be derived for existing locks
3. Coordinated with solver infrastructure

## 2. Master Key Must Stay Non-Extractable

The master key (`derivedKey` in `secretDerivationStore`) is a **non-extractable `CryptoKey`**. This is a security invariant.

Do NOT:
- Store raw key bytes (`Uint8Array`) in the store, context, or any persistent storage
- Export or extract the CryptoKey to bytes (e.g. via `crypto.subtle.exportKey`)
- Pass `extractable: true` to `importKey` for master keys
- Log, serialize, or transmit the master key

The only permitted operation on the master key is `crypto.subtle.deriveBits()`.

## 3. Per-Swap Secrets Are Short-Lived

The per-swap secret (output of `deriveSecretFromCryptoKey`) is a `Uint8Array` — it must be readable to compute the hashlock and send to the solver API. This is acceptable because:
- It's a single-use, per-swap value (not the master key)
- It's only in memory briefly during swap creation and secret reveal

Do NOT persist per-swap secrets to storage or global state.

## 4. CryptoKey Storage in IndexedDB

`SecureStorage.storeCryptoKey()` stores the `CryptoKey` directly in IndexedDB via structured cloning. The browser preserves the non-extractable flag across sessions.

Do NOT replace this with encrypt-then-store of raw bytes — that defeats the purpose.

## 5. Wallet-Sign Implementations

Each chain's `wallet-sign.ts` must:
1. Get signature bytes from the wallet
2. Call `createProtectedKey(signatureBytes)` to import as non-extractable CryptoKey
3. Zero the signature bytes after import (`signatureBytes.fill(0)`) where practical
4. Return the `CryptoKey`

Do NOT run intermediate HKDF in JS memory before importing — the raw bytes go straight into Web Crypto.
