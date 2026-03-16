# Migration Guide: Azguard SDK to Aztec Wallet SDK

This guide provides a **side-by-side mapping** for migrating frontends from `@azguardwallet/client` to `@aztec/wallet-sdk`. It's based on real production codebases (Holonym Aztec Bridge, GregoSwap) and covers every integration pattern.

---

## Quick Summary of Changes

| What | Before (Azguard) | After (Wallet SDK) |
|------|-------------------|---------------------|
| Package | `@azguardwallet/client` | `@aztec/wallet-sdk` |
| Detection | `window.azguard` polling | `window.postMessage` discovery broadcast |
| Connection | `AzguardClient.create()` + `.connect()` | `WalletManager.configure()` + discovery + ECDH + emoji verify |
| Account format | CAIP-10 string `"aztec:chainId:0x..."` | `AztecAddress` object (with optional `.alias`) |
| Transactions | `azguard.execute([{ kind: 'send_transaction', ... }])` | `wallet.sendTx(payload, opts)` or `contract.methods.fn().send()` |
| View calls | `azguard.execute([{ kind: 'simulate_views', ... }])` | `wallet.simulateUtility(call, opts)` |
| Auth witnesses | Action inside `send_transaction` operations | `wallet.createAuthWit(from, intent)` |
| Permissions | `connect(metadata, permissions[])` | `wallet.requestCapabilities(manifest)` |
| Events | `onDisconnected.addHandler(fn)` | `provider.onDisconnect(fn)` |
| Session restore | Automatic via localStorage | Requires re-discovery (wallet manages sessions) |

---

## Step 1: Replace Package Dependencies

```bash
# Remove Azguard
npm uninstall @azguardwallet/client @azguardwallet/types

# Install wallet-sdk (already part of @aztec/aztec.js ecosystem)
npm install @aztec/wallet-sdk
```

---

## Step 2: Replace Client Initialization & Connection

### Before (Azguard)

```typescript
import { AzguardClient } from '@azguardwallet/client';

// Check installation
if (!(await AzguardClient.isAzguardInstalled())) {
  throw new Error('Azguard wallet is not installed');
}

// Create client (auto-restores session from localStorage)
const azguardClient = await AzguardClient.create();

// If already connected from previous session
if (azguardClient.connected && azguardClient.accounts.length > 0) {
  const account = azguardClient.accounts[0];
  const address = account.split(':').at(-1);
  // Ready to use
}

// Otherwise, connect
await azguardClient.connect(
  {
    name: 'My App',
    description: 'App description',
    logo: 'https://example.com/logo.png',
    url: window.location.origin,
  },
  [
    {
      chains: ['aztec:31337'],
      methods: ['send_transaction', 'simulate_views', 'register_contract'],
    },
  ]
);

const account = azguardClient.accounts[0];
const address = account.split(':').at(-1);
```

### After (Wallet SDK)

```typescript
import { WalletManager, type WalletProvider, type PendingConnection } from '@aztec/wallet-sdk/manager';
import { hashToEmoji } from '@aztec/wallet-sdk/crypto';
import type { ChainInfo } from '@aztec/aztec.js/account';
import type { Wallet, AppCapabilities, GrantedAccountsCapability } from '@aztec/aztec.js/wallet';
import { Fr } from '@aztec/aztec.js/fields';

const APP_ID = 'my-app';
const chainInfo: ChainInfo = {
  chainId: Fr.fromString('31337'),
  version: Fr.fromString('0'),
};

// Step 1: Discover wallets (replaces isAzguardInstalled + create)
const manager = WalletManager.configure({ extensions: { enabled: true } });
const discovery = manager.getAvailableWallets({
  chainInfo,
  appId: APP_ID,
  timeout: 10000,
});

// Collect discovered wallets
const wallets: WalletProvider[] = [];
for await (const provider of discovery.wallets) {
  wallets.push(provider);
}

if (wallets.length === 0) {
  throw new Error('No wallet extensions found');
}

// Step 2: Establish secure channel (new - emoji verification)
const provider = wallets[0]; // Or let user choose
const pending: PendingConnection = await provider.establishSecureChannel(APP_ID);

// Display emoji verification to user
const emojis = hashToEmoji(pending.verificationHash);
// Show emojis, user confirms they match wallet

// Step 3: Confirm connection
const wallet: Wallet = await pending.confirm();

// Step 4: Request capabilities (replaces connect permissions)
const manifest: AppCapabilities = {
  version: '1.0',
  metadata: {
    name: 'My App',
    version: '1.0.0',
    description: 'App description',
    url: window.location.origin,
  },
  capabilities: [
    { type: 'accounts', canGet: true, canCreateAuthWit: true },
    {
      type: 'contracts',
      contracts: [myContractAddress],
      canRegister: true,
      canGetMetadata: true,
    },
    {
      type: 'simulation',
      utilities: { scope: [{ contract: tokenAddress, function: 'balance_of_private' }] },
    },
    {
      type: 'transaction',
      scope: [{ contract: myContractAddress, function: 'my_function' }],
    },
  ],
};

const capabilities = await wallet.requestCapabilities(manifest);
const accountsCap = capabilities.granted.find(
  (c): c is GrantedAccountsCapability => c.type === 'accounts'
);

// Accounts are now AztecAddress objects (not CAIP strings)
const accounts = accountsCap!.accounts; // Aliased<AztecAddress>[]
const address = accounts[0]; // AztecAddress with optional .alias
```

**Key difference**: Wallet SDK doesn't have automatic session restore from localStorage. The wallet extension manages sessions internally. On page reload, you re-run discovery - if the wallet has an active session, it responds immediately.

---

## Step 3: Replace Event Handlers

### Before (Azguard)

```typescript
azguardClient.onDisconnected.addHandler(() => {
  // Handle disconnect
  resetState();
});

azguardClient.onAccountsChanged.addHandler((accounts) => {
  const newAddress = accounts[0]?.split(':').at(-1);
  updateAddress(newAddress);
});

azguardClient.onConnected.addHandler(() => {
  // Handle connected
});
```

### After (Wallet SDK)

```typescript
// Disconnect handler (per-provider, returns unsubscribe function)
const unsubscribe = provider.onDisconnect(() => {
  resetState();
});

// No direct onAccountsChanged equivalent - accounts are fixed after requestCapabilities
// If the wallet wants to change accounts, it disconnects and reconnects

// Check connection status
if (provider.isDisconnected()) {
  // Wallet is no longer connected
}

// Cleanup
unsubscribe();
```

**Key difference**: Wallet SDK has simpler events. There's no `onAccountsChanged` because account grants are fixed at capability request time. If accounts change, the wallet disconnects.

---

## Step 4: Replace Transaction Execution

### Before (Azguard) - Simple Call

```typescript
import type { AzguardSendTransactionOperation, AzguardCallAction } from './types';

const callAction: AzguardCallAction = {
  kind: 'call',
  contract: contractAddress,
  method: 'transfer',
  args: [recipientAddress, amount],
};

const txOp: AzguardSendTransactionOperation = {
  kind: 'send_transaction',
  account: azguardAccount,  // CAIP-10 string
  actions: [callAction],
  fee: { gasPadding: 2 },
};

const [result] = await azguardClient.execute([txOp]);
if (result.status !== 'ok') throw new Error(result.error);
const txHash = result.result; // string
```

### After (Wallet SDK) - Simple Call

```typescript
import { Contract } from '@aztec/aztec.js/contract';

// Option A: Using Contract abstraction (recommended)
const contract = await Contract.at(contractAddress, ContractArtifact, wallet);
const receipt = await contract.methods
  .transfer(recipientAddress, amount)
  .send({ from: accountAddress })
  .wait();

// Option B: Using wallet.sendTx directly
const receipt = await wallet.sendTx(executionPayload, {
  from: accountAddress,
});
```

### Before (Azguard) - With Auth Witness

```typescript
// Create authwit + call in same transaction
const authwitAction = {
  kind: 'add_public_authwit',
  content: {
    kind: 'call',
    caller: bridgeAddress,        // Who is authorized
    contract: tokenAddress,       // Target contract
    method: 'burn_public',
    args: [userAddress, amount, nonce],
  },
};

const exitAction = {
  kind: 'call',
  contract: bridgeAddress,
  method: 'exit_to_l1_public',
  args: [l1Address, amount, ethAddressZero, nonce],
};

const txOp = {
  kind: 'send_transaction',
  account: azguardAccount,
  actions: [authwitAction, exitAction],
  fee: { gasPadding: 2 },
};

const [result] = await azguardClient.execute([txOp]);
```

### After (Wallet SDK) - With Auth Witness

```typescript
// Auth witnesses are created separately, then transaction is sent
// The wallet handles the auth witness internally when sending the transaction

const token = await Contract.at(tokenAddress, TokenArtifact, wallet);
const bridge = await Contract.at(bridgeAddress, BridgeArtifact, wallet);

// Create the auth witness
const authWit = await wallet.createAuthWit(
  accountAddress,
  {
    caller: bridgeAddress,
    action: token.methods.burn_public(accountAddress, amount, nonce),
  }
);

// Send the transaction (wallet includes auth witness automatically)
const receipt = await bridge.methods
  .exit_to_l1_public(l1Address, amount, EthAddress.ZERO, nonce)
  .send({ from: accountAddress })
  .wait();
```

---

## Step 5: Replace View/Simulation Calls

### Before (Azguard)

```typescript
// Single view call
const simulateOp = {
  kind: 'simulate_views',
  account: azguardAccount,
  calls: [
    { kind: 'call', contract: tokenAddress, method: 'balance_of_private', args: [userAddress] },
  ],
};

const [result] = await azguardClient.execute([simulateOp]);
const balance = result.result?.decoded?.[0];

// Multiple view calls
const multiSimulateOp = {
  kind: 'simulate_views',
  account: azguardAccount,
  calls: [
    { kind: 'call', contract: tokenAddress, method: 'balance_of_private', args: [userAddress] },
    { kind: 'call', contract: tokenAddress, method: 'balance_of_public', args: [userAddress] },
  ],
};

const [multiResult] = await azguardClient.execute([multiSimulateOp]);
const [privateBalance, publicBalance] = multiResult.result?.decoded;
```

### After (Wallet SDK)

```typescript
import { Contract, BatchCall } from '@aztec/aztec.js';

const token = await Contract.at(tokenAddress, TokenArtifact, wallet);

// Single view call (simulateUtility for unconstrained functions)
const balance = await wallet.simulateUtility(
  token.methods.balance_of_private(userAddress).request(),
  { from: accountAddress }
);

// Multiple view calls with BatchCall
const batchCall = new BatchCall(wallet, [
  token.methods.balance_of_private(userAddress),
  token.methods.balance_of_public(userAddress),
]);
const [privateBalance, publicBalance] = await batchCall.simulate({ from: accountAddress });
```

---

## Step 6: Replace Contract Registration

### Before (Azguard)

```typescript
// Register contract
const registerOp = {
  kind: 'register_contract',
  chain: 'aztec:31337',
  address: contractAddress,
  instance: contractInstance,   // optional
  artifact: contractArtifact,  // optional
};

const [result] = await azguardClient.execute([registerOp]);

// Register token (Azguard-specific)
const registerTokenOp = {
  kind: 'register_token',
  account: azguardAccount,
  address: tokenAddress,
};

await azguardClient.execute([registerTokenOp]);
```

### After (Wallet SDK)

```typescript
// Register contract
await wallet.registerContract(contractInstance, contractArtifact);

// Or just register by instance (wallet fetches artifact from node)
await wallet.registerContract(contractInstance);

// Register a sender
await wallet.registerSender(senderAddress, 'Optional Alias');

// No direct "register_token" equivalent - token contracts are just regular contracts
await wallet.registerContract(tokenContractInstance, TokenArtifact);
```

---

## Step 7: Replace Disconnection

### Before (Azguard)

```typescript
await azguardClient.disconnect();
azguardClient = null;
```

### After (Wallet SDK)

```typescript
// Disconnect the provider
await provider.disconnect();

// Clean up disconnect listener
unsubscribe?.();
```

---

## Step 8: Replace Error Handling

### Before (Azguard)

```typescript
const [result] = await azguardClient.execute([operation]);

if (result.status === 'failed') {
  const errorMsg = result.error;

  // Auto-register contract on artifact not found
  if (errorMsg.includes('artifact') || errorMsg.includes('not found')) {
    const retryOps = [
      { kind: 'register_contract', chain, address },
      operation,
    ];
    const [regResult, txResult] = await azguardClient.execute(retryOps);
    // ...
  }

  throw new Error(result.error);
}

if (result.status === 'skipped') {
  // Previous operation in batch failed
}

const data = result.result;
```

### After (Wallet SDK)

```typescript
try {
  const receipt = await wallet.sendTx(payload, opts);
  // Success
} catch (error) {
  if (error.message.includes('Simulation failed')) {
    // Transaction would revert
  } else if (error.message.includes('rejected') || error.message.includes('User denied')) {
    // User rejected in wallet
  } else if (error.message.includes('not registered')) {
    // Register contract first, then retry
    await wallet.registerContract(contractInstance, artifact);
    const receipt = await wallet.sendTx(payload, opts);
  }
}
```

**Key difference**: Wallet SDK uses standard try/catch instead of result objects with `status: 'ok' | 'failed' | 'skipped'`.

---

## Step 9: Replace Account Address Handling

### Before (Azguard)

```typescript
// Accounts are CAIP-10 strings
const account: string = azguardClient.accounts[0];
// "aztec:1654394782:0x2ab7cf582347..."

// Extract raw address
const address: string = account.split(':').at(-1)!;

// Pass to operations as string
const txOp = {
  kind: 'send_transaction',
  account: account,  // Full CAIP string
  actions: [...],
};
```

### After (Wallet SDK)

```typescript
// Accounts are Aliased<AztecAddress> objects
const accounts = capabilities.granted
  .find(c => c.type === 'accounts')!.accounts;

const account: Aliased<AztecAddress> = accounts[0];

// Use directly (it's already an AztecAddress)
const address: AztecAddress = account;
const addressString: string = account.toString();
const alias: string | undefined = account.alias;

// Pass to wallet methods
const receipt = await wallet.sendTx(payload, { from: account });
```

---

## Step 10: Replace Wallet Adapter Pattern

If you have a wallet adapter abstraction (like Holonym), here's how to migrate it:

### Before (Azguard Adapter)

```typescript
class AzguardWalletAdapter {
  constructor(
    private azguardClient: AzguardClient,
    private account: string,
  ) {}

  async simulateView(contract: string, method: string, args: any[]) {
    const op = {
      kind: 'simulate_views',
      account: this.account,
      calls: [{ kind: 'call', contract, method, args }],
    };
    const [result] = await this.azguardClient.execute([op]);
    if (result.status !== 'ok') throw new Error(result.error);
    return result.result.decoded[0];
  }

  async executeCall(contract: string, method: string, args: any[]) {
    const op = {
      kind: 'send_transaction',
      account: this.account,
      actions: [{ kind: 'call', contract, method, args }],
      fee: { gasPadding: 2 },
    };
    const [result] = await this.azguardClient.execute([op]);
    if (result.status !== 'ok') throw new Error(result.error);
    return result.result;
  }
}
```

### After (Wallet SDK Adapter)

```typescript
import { Contract, BatchCall } from '@aztec/aztec.js';
import type { Wallet } from '@aztec/aztec.js/wallet';
import type { AztecAddress } from '@aztec/aztec.js/addresses';

class WalletSDKAdapter {
  constructor(
    private wallet: Wallet,
    private account: AztecAddress,
  ) {}

  async simulateView(contractAddress: AztecAddress, artifact: any, method: string, args: any[]) {
    const contract = await Contract.at(contractAddress, artifact, this.wallet);
    return contract.methods[method](...args).simulate({ from: this.account });
  }

  async executeCall(contractAddress: AztecAddress, artifact: any, method: string, args: any[]) {
    const contract = await Contract.at(contractAddress, artifact, this.wallet);
    const receipt = await contract.methods[method](...args)
      .send({ from: this.account })
      .wait();
    return receipt.txHash.toString();
  }
}
```

---

## Common Patterns Comparison Table

| Pattern | Azguard | Wallet SDK |
|---------|---------|------------|
| Get balance | `execute([{ kind: 'simulate_views', calls: [{ method: 'balance_of_private', args }] }])` → `result.decoded[0]` | `contract.methods.balance_of_private(addr).simulate({ from })` |
| Send transfer | `execute([{ kind: 'send_transaction', actions: [{ kind: 'call', method: 'transfer', args }] }])` | `contract.methods.transfer(to, amt).send({ from }).wait()` |
| Create public authwit | `{ kind: 'add_public_authwit', content: { kind: 'call', caller, contract, method, args } }` as action in send_transaction | `wallet.createAuthWit(from, { caller, action: contract.methods.fn(args) })` |
| Register contract | `execute([{ kind: 'register_contract', chain, address, artifact }])` | `wallet.registerContract(instance, artifact)` |
| Multiple views | Single `simulate_views` operation with `calls: [call1, call2]` | `new BatchCall(wallet, [method1, method2]).simulate()` |
| Check connection | `azguardClient.connected` | `!provider.isDisconnected()` |
| Disconnect | `azguardClient.disconnect()` | `provider.disconnect()` |
| Get accounts | `azguardClient.accounts` (CAIP strings) | `capabilities.granted.find(c => c.type === 'accounts').accounts` (AztecAddress[]) |

---

## Bridge-Specific Migration (L2 to L1 Exit)

This is a common pattern in bridge apps (Holonym, Raven Bridge). The Azguard version batches authwit + exit call as actions in a single `send_transaction`, while wallet-sdk separates them.

### Before (Azguard) - Batched authwit + exit

```typescript
const nonce = Fr.random();

const txOp = {
  kind: 'send_transaction',
  account: azguardAccount,
  actions: [
    {
      kind: isPrivate ? 'add_private_authwit' : 'add_public_authwit',
      content: {
        kind: 'call',
        caller: bridgeAddress,
        contract: tokenAddress,
        method: isPrivate ? 'burn_private' : 'burn_public',
        args: [userAddress, amount.toString(), nonce.toString()],
      },
    },
    {
      kind: 'call',
      contract: bridgeAddress,
      method: isPrivate ? 'exit_to_l1_private' : 'exit_to_l1_public',
      args: [l1Address, amount.toString(), EthAddress.ZERO.toString(), nonce.toString()],
    },
  ],
};

const [result] = await azguardClient.execute([txOp]);
```

### After (Wallet SDK) - Separate authwit + send

```typescript
const nonce = Fr.random();

const token = await Contract.at(tokenAddress, TokenArtifact, wallet);
const bridge = await Contract.at(bridgeAddress, BridgeArtifact, wallet);

// Create auth witness first
await wallet.createAuthWit(accountAddress, {
  caller: bridgeAddress,
  action: isPrivate
    ? token.methods.burn_private(accountAddress, amount, nonce)
    : token.methods.burn_public(accountAddress, amount, nonce),
});

// Then send the exit transaction
const receipt = await bridge.methods[isPrivate ? 'exit_to_l1_private' : 'exit_to_l1_public'](
  ...(isPrivate
    ? [tokenAddress, l1Address, amount, EthAddress.ZERO, nonce]
    : [l1Address, amount, EthAddress.ZERO, nonce])
)
  .send({ from: accountAddress })
  .wait();
```

---

## Key Pitfalls When Migrating (from real integration)

These are non-obvious issues that will bite you during migration:

1. **WASM now runs in the browser**: With Azguard, all Barretenberg WASM ran inside the extension. With wallet-sdk, `Contract.at().simulate()` needs WASM locally for ABI encoding. You MUST add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` headers or you'll get `proc_exit` WASM crashes.

2. **Contracts must be registered with the PXE**: Azguard handled this internally. With wallet-sdk, call `wallet.registerContract(instance, artifact)` before any simulate/send. Get the instance from the node: `await aztecNode.getContract(address)`.

3. **Discovery → connect timing matters**: Don't wait for full discovery timeout before connecting. Use the `onWalletDiscovered` callback and connect immediately (~1s after discovery). Waiting 10s causes "Key exchange timeout".

4. **`Aliased<AztecAddress>` wraps the address**: `wallet.getAccounts()` returns wrapped objects. Calling `.toString()` on the wrapper gives `[object Object]`. Unwrap with `account?.item ?? account?.address ?? account` before converting to string.

5. **`.send()` already returns the receipt**: No `.wait()` needed — `contract.methods.fn().send()` returns `Promise<TxReceipt>` directly.

6. **`createAuthWit` uses `call`, not `action`**: The `CallIntent` type has `{ caller, call: FunctionCall }`. Use `await token.methods.burn_public(...).getFunctionCall()` to get the `FunctionCall`.

7. **Import `Contract` from `contracts` (plural)**: `import { Contract } from '@aztec/aztec.js/contracts'`, not `contract`.

See the "Gotchas & Lessons Learned" section in `wallet-sdk.md` for full details and code examples.

## Checklist for Migration

- [ ] Replace `@azguardwallet/client` with `@aztec/wallet-sdk` in package.json
- [ ] **Add COOP/COEP headers** to your web server config (Next.js `headers()`, Vite `server.headers`)
- [ ] Replace wallet detection (`AzguardClient.isAzguardInstalled()`) with `WalletManager.configure().getAvailableWallets()`
- [ ] Add emoji verification UI (3x3 grid using `hashToEmoji()`)
- [ ] **Connect to providers immediately on discovery** (don't wait for full timeout)
- [ ] Replace `azguard.connect(metadata, permissions)` with `wallet.requestCapabilities(manifest)`
- [ ] Convert CAIP-10 account strings to `AztecAddress` objects
- [ ] **Handle `Aliased<AztecAddress>` unwrapping** (`.item ?? .address ?? raw`)
- [ ] Replace `azguard.execute([{ kind: 'send_transaction', ... }])` with `contract.methods.fn().send()`
- [ ] Replace `azguard.execute([{ kind: 'simulate_views', ... }])` with `contract.methods.fn().simulate()` or `wallet.simulateUtility()`
- [ ] Replace authwit actions with `wallet.createAuthWit()` — use `call` field with `getFunctionCall()`
- [ ] Replace `azguard.execute([{ kind: 'register_contract', ... }])` with `wallet.registerContract(instance, artifact)`
- [ ] **Register contracts during adapter init** — fetch instance from node with `aztecNode.getContract(addr)`
- [ ] Replace event handlers (`onDisconnected.addHandler` → `provider.onDisconnect`)
- [ ] Remove `onAccountsChanged` handler (no equivalent needed)
- [ ] Remove `onConnected` handler (use post-connection logic directly)
- [ ] Update error handling from result-status pattern to try/catch
- [ ] Remove localStorage session restore logic (wallet manages sessions)
- [ ] Remove `register_token` operations (use `registerContract` instead)
- [ ] Update any CAIP chain ID references to `ChainInfo` objects
- [ ] Remove all `@azguardwallet/types` imports and replace with `@aztec/aztec.js` types
- [ ] Test emoji verification flow end-to-end
- [ ] Test disconnect/reconnect flow
- [ ] **Test balance queries work** (WASM must init successfully)
