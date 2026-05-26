# Aztec Wallet SDK - Integration Skill

## Overview

The **Aztec Wallet SDK** (`@aztec/wallet-sdk`) is the standard way for dApps to discover, connect to, and communicate with Aztec wallets (browser extensions or web wallets). It provides encrypted communication channels, emoji-based MITM verification, capability-based authorization, and a full `Wallet` interface for sending transactions, simulating calls, and managing contracts.

This skill covers **two audiences**:
1. **dApp developers** integrating a wallet connection into their frontend (most common)
2. **Wallet developers** building a wallet extension or web wallet

---

## Architecture at a Glance

```
┌─────────────────┐   window.postMessage   ┌──────────────────┐   browser.runtime   ┌────────────────────┐
│   dApp          │◄──(discovery + port)──►│  Content Script  │◄──────────────────►│  Background Script │
│   (web page)    │                        │  (message relay) │                    │  (wallet logic)    │
└─────────────────┘                        └──────────────────┘                    └────────────────────┘
       │                                            │
       │              MessagePort                   │
       └──────(ECDH key exchange + AES-GCM)─────────┘
```

**Connection Flow:**
1. **Discovery** - dApp broadcasts `aztec-wallet-discovery` via `window.postMessage`; wallet content scripts relay to background; wallet responds with `WalletInfo` + a `MessagePort`
2. **Key Exchange** - ECDH P-256 key exchange over the `MessagePort`; both sides derive AES-256-GCM encryption key + verification hash via HKDF
3. **Emoji Verification** - Verification hash converted to 3x3 emoji grid using `hashToEmoji()`; user visually confirms both sides show same emojis (anti-MITM)
4. **Encrypted Channel** - All subsequent `Wallet` interface method calls are encrypted with AES-256-GCM over the `MessagePort`

---

## Package Exports

```typescript
// dApp-side: wallet discovery & connection
import { WalletManager, type WalletProvider, type PendingConnection, type DiscoverySession } from '@aztec/wallet-sdk/manager';

// Emoji verification utility
import { hashToEmoji } from '@aztec/wallet-sdk/crypto';

// Wallet-side: browser extension handlers
import { BackgroundConnectionHandler, ContentScriptConnectionHandler } from '@aztec/wallet-sdk/extension/handlers';

// Wallet-side: abstract base wallet class
import { BaseWallet } from '@aztec/wallet-sdk/base-wallet';

// Shared message types
import { WalletMessageType } from '@aztec/wallet-sdk/types';
```

---

## PART 1: dApp Integration (Frontend)

### Step 1: Configure WalletManager and Discover Wallets

```typescript
import { WalletManager, type WalletProvider, type DiscoverySession } from '@aztec/wallet-sdk/manager';
import type { ChainInfo } from '@aztec/aztec.js/account';
import { Fr } from '@aztec/aztec.js/fields';

// Get chain info from your Aztec node (MUST await + wrap in Fr)
const [chainId, version] = await Promise.all([node.getChainId(), node.getVersion()]);
const chainInfo: ChainInfo = {
  chainId: new Fr(chainId),
  version: new Fr(version),
};

// Configure manager and start discovery
const manager = WalletManager.configure({
  extensions: { enabled: true },
  // Optional: restrict to specific extensions
  // extensions: { enabled: true, allowList: ['specific-extension-id'] },
  // Optional: web wallets
  // webWallets: { urls: ['https://wallet.example.com'] },
});

const discovery: DiscoverySession = manager.getAvailableWallets({
  chainInfo,
  appId: 'my-app',         // Unique identifier for your dApp
  timeout: 10000,           // Discovery timeout in ms (default: 60000)
  onWalletDiscovered: (provider: WalletProvider) => {
    // Called immediately as each wallet responds to discovery
    // Use this to update UI in real-time
    console.log(`Found wallet: ${provider.name} (${provider.id})`);
  },
});

// Option A: Iterate with for-await (blocks until all wallets found or timeout)
const discoveredWallets: WalletProvider[] = [];
for await (const provider of discovery.wallets) {
  discoveredWallets.push(provider);
}

// Option B: Use the callback above + cancel when you have enough
// discovery.cancel();  // Stop discovery early

// Option C: Wait for completion
// await discovery.done;
```

### Step 2: Establish Secure Channel (Emoji Verification)

```typescript
import { hashToEmoji } from '@aztec/wallet-sdk/crypto';
import type { PendingConnection } from '@aztec/wallet-sdk/manager';

// User selects a wallet provider from the discovered list
const selectedProvider: WalletProvider = discoveredWallets[0];

// Initiate key exchange
const pending: PendingConnection = await selectedProvider.establishSecureChannel('my-app');

// Convert verification hash to emoji grid for display
const emojis = hashToEmoji(pending.verificationHash);
// Returns something like: "🔵🦋🎯🐼🌟🎲🦊🐸💎"

// Display emojis to user in a 3x3 grid:
// 🔵 🦋 🎯
// 🐼 🌟 🎲
// 🦊 🐸 💎

// User confirms emojis match what the wallet shows
const wallet = await pending.confirm();  // Returns a Wallet instance

// OR user says emojis don't match
// pending.cancel();
```

### Step 3: Request Capabilities (Account Selection)

After confirming the secure channel, request capabilities to get accounts and declare what your app needs:

```typescript
import type { AppCapabilities, WalletCapabilities, GrantedAccountsCapability } from '@aztec/aztec.js/wallet';
import type { Wallet, Aliased } from '@aztec/aztec.js/wallet';
import type { AztecAddress } from '@aztec/aztec.js/addresses';

const manifest: AppCapabilities = {
  version: '1.0',
  metadata: {
    name: 'My dApp',
    version: '1.0.0',
    description: 'Description of my application',
    url: 'https://mydapp.example.com',
  },
  capabilities: [
    // Request account access
    {
      type: 'accounts',
      canGet: true,
      canCreateAuthWit: true,  // Set true if your app needs auth witnesses
    },

    // Request contract registration (specify your contract addresses)
    {
      type: 'contracts',
      contracts: [myContractAddress, tokenAddress],
      canRegister: true,
      canGetMetadata: true,
    },

    // Request simulation permissions (auto-approved, no per-call popup)
    {
      type: 'simulation',
      utilities: {
        scope: [
          { contract: tokenAddress, function: 'balance_of_private' },
        ],
      },
      transactions: {
        scope: [
          { contract: tokenAddress, function: 'balance_of_public' },
        ],
      },
    },

    // Request transaction permissions (wallet shows per-tx approval)
    {
      type: 'transaction',
      scope: [
        { contract: myContractAddress, function: 'my_function' },
      ],
    },
  ],
};

const capabilities: WalletCapabilities = await wallet.requestCapabilities(manifest);

// Extract granted accounts
const accountsCap = capabilities.granted.find(
  (c): c is GrantedAccountsCapability => c.type === 'accounts'
);

if (!accountsCap || accountsCap.accounts.length === 0) {
  throw new Error('No accounts granted');
}

// accounts is Aliased<AztecAddress>[] — each has { alias: string, item: AztecAddress }
const accounts: Aliased<AztecAddress>[] = accountsCap.accounts;

// Show account aliases to the user; select the first if only one
const selectedAccount = accounts[0];
const address = selectedAccount.item;  // AztecAddress object
const label = selectedAccount.alias;   // Human-readable name, e.g. "Main Account"
console.log(`Using account: ${label} (${address.toString().slice(0, 14)}...)`);
```

### Step 4: Register Contracts

Before interacting with contracts, register them with the wallet:

```typescript
import { TokenContract } from '@aztec/noir-contracts.js/Token';

// Register a contract instance + artifact
await wallet.registerContract(contractInstance, contractArtifact);

// Or just register the instance (wallet fetches artifact from node)
await wallet.registerContract(contractInstance);

// Register a sender (for auth witnesses from other addresses)
await wallet.registerSender(otherAddress, 'Optional Alias');
```

### Step 5: Send Transactions

```typescript
import { Contract } from '@aztec/aztec.js/contract';

// Create a contract instance connected to the wallet
const token = await Contract.at(tokenAddress, TokenContractArtifact, wallet);

// Send a transaction
const tx = token.methods
  .transfer(recipientAddress, amount)
  .send({ from: selectedAccount });

// Wait for the transaction to be mined
const receipt = await tx.wait();
console.log(`TX mined: ${receipt.txHash}`);
```

### Step 6: Simulate (View) Calls

```typescript
// Simulate a utility function (unconstrained / view call)
const balance = await wallet.simulateUtility(
  token.methods.balance_of_private(selectedAccount).request(),
  { from: selectedAccount }
);

// Simulate a transaction (without sending)
const simResult = await wallet.simulateTx(executionPayload, {
  from: selectedAccount,
});
```

### Step 7: Handle Disconnection

```typescript
// Register disconnect handler
const unsubscribe = selectedProvider.onDisconnect(() => {
  console.log('Wallet disconnected unexpectedly!');
  // Reset UI to disconnected state
  // Optionally restart discovery
});

// Check if still connected
if (selectedProvider.isDisconnected()) {
  console.log('Wallet is no longer connected');
}

// Explicitly disconnect
await selectedProvider.disconnect();

// Cleanup
unsubscribe();
```

---

## Complete React Integration Example

Here's a recommended React architecture based on the reference implementation (GregoSwap):

### Wallet Service (Pure Functions)

```typescript
// src/services/walletService.ts
import { WalletManager, type WalletProvider, type PendingConnection, type DiscoverySession } from '@aztec/wallet-sdk/manager';
import type { ChainInfo } from '@aztec/aztec.js/account';
import type { Wallet } from '@aztec/aztec.js/wallet';

const APP_ID = 'my-app';

export function discoverWallets(chainInfo: ChainInfo, timeout?: number): DiscoverySession {
  const manager = WalletManager.configure({ extensions: { enabled: true } });
  return manager.getAvailableWallets({ chainInfo, appId: APP_ID, timeout });
}

export async function initiateConnection(provider: WalletProvider): Promise<PendingConnection> {
  return provider.establishSecureChannel(APP_ID);
}

export async function confirmConnection(pending: PendingConnection): Promise<Wallet> {
  return pending.confirm();
}

export function cancelConnection(pending: PendingConnection): void {
  pending.cancel();
}

export async function disconnectProvider(provider: WalletProvider): Promise<void> {
  await provider.disconnect();
}
```

### Wallet Context (State Management)

```typescript
// src/contexts/WalletContext.tsx
import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import type { Wallet, WalletCapabilities } from '@aztec/aztec.js/wallet';
import type { WalletProvider, PendingConnection, DiscoverySession } from '@aztec/wallet-sdk/manager';
import type { AztecAddress } from '@aztec/aztec.js/addresses';
import * as walletService from '../services/walletService';

interface WalletContextType {
  wallet: Wallet | null;
  currentAddress: AztecAddress | null;
  isConnected: boolean;
  discoverWallets: (timeout?: number) => DiscoverySession;
  initiateConnection: (provider: WalletProvider) => Promise<PendingConnection>;
  confirmConnection: (provider: WalletProvider, pending: PendingConnection) => Promise<Wallet>;
  cancelConnection: (pending: PendingConnection) => void;
  setCurrentAddress: (address: AztecAddress) => void;
  disconnectWallet: () => Promise<void>;
  onWalletDisconnect: (callback: () => void) => () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children, chainInfo }: { children: React.ReactNode; chainInfo: ChainInfo }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [currentAddress, setCurrentAddress] = useState<AztecAddress | null>(null);
  const providerRef = useRef<WalletProvider | null>(null);
  const disconnectUnsubRef = useRef<(() => void) | null>(null);
  const disconnectCallbacksRef = useRef<Set<() => void>>(new Set());

  const handleUnexpectedDisconnect = useCallback(() => {
    setWallet(null);
    setCurrentAddress(null);
    providerRef.current = null;

    // Notify all registered callbacks
    for (const cb of disconnectCallbacksRef.current) {
      try { cb(); } catch {}
    }
  }, []);

  const discoverWallets = useCallback(
    (timeout?: number) => walletService.discoverWallets(chainInfo, timeout),
    [chainInfo]
  );

  const initiateConnection = useCallback(
    (provider: WalletProvider) => walletService.initiateConnection(provider),
    []
  );

  const confirmConnection = useCallback(
    async (provider: WalletProvider, pending: PendingConnection) => {
      const connectedWallet = await walletService.confirmConnection(pending);

      // Store provider and register disconnect handler
      providerRef.current = provider;
      disconnectUnsubRef.current = provider.onDisconnect(handleUnexpectedDisconnect);

      setWallet(connectedWallet);
      return connectedWallet;
    },
    [handleUnexpectedDisconnect]
  );

  const cancelConnection = useCallback(
    (pending: PendingConnection) => walletService.cancelConnection(pending),
    []
  );

  const disconnectWallet = useCallback(async () => {
    if (disconnectUnsubRef.current) {
      disconnectUnsubRef.current();
      disconnectUnsubRef.current = null;
    }
    if (providerRef.current) {
      await walletService.disconnectProvider(providerRef.current);
      providerRef.current = null;
    }
    setWallet(null);
    setCurrentAddress(null);
  }, []);

  const onWalletDisconnect = useCallback((callback: () => void) => {
    disconnectCallbacksRef.current.add(callback);
    return () => { disconnectCallbacksRef.current.delete(callback); };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectUnsubRef.current?.();
    };
  }, []);

  return (
    <WalletContext.Provider value={{
      wallet,
      currentAddress,
      isConnected: wallet !== null,
      discoverWallets,
      initiateConnection,
      confirmConnection,
      cancelConnection,
      setCurrentAddress,
      disconnectWallet,
      onWalletDisconnect,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be inside WalletProvider');
  return ctx;
}
```

### Onboarding Modal UI (Discovery + Verification + Account Selection)

```typescript
// src/components/OnboardingModal.tsx
import { useState, useEffect } from 'react';
import type { WalletProvider, PendingConnection } from '@aztec/wallet-sdk/manager';
import { hashToEmoji } from '@aztec/wallet-sdk/crypto';
import type { Aliased, AztecAddress, GrantedAccountsCapability } from '@aztec/aztec.js';
import { useWallet } from '../contexts/WalletContext';

type Phase = 'discovering' | 'verifying' | 'selecting-account' | 'connected';

export function OnboardingModal({ manifest }: { manifest: AppCapabilities }) {
  const { discoverWallets, initiateConnection, confirmConnection, cancelConnection, setCurrentAddress, onWalletDisconnect } = useWallet();
  const [phase, setPhase] = useState<Phase>('discovering');
  const [discoveredWallets, setDiscoveredWallets] = useState<WalletProvider[]>([]);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [emojiGrid, setEmojiGrid] = useState<string>('');
  const [accounts, setAccounts] = useState<Aliased<AztecAddress>[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<WalletProvider | null>(null);

  // Phase 1: Discover wallets
  useEffect(() => {
    if (phase !== 'discovering') return;

    const discovery = discoverWallets(10000);
    let cancelled = false;

    (async () => {
      for await (const provider of discovery.wallets) {
        if (cancelled) break;
        setDiscoveredWallets(prev => [...prev, provider]);
      }
    })();

    return () => {
      cancelled = true;
      discovery.cancel();
    };
  }, [phase, discoverWallets]);

  // Handle wallet selection -> initiate key exchange
  const handleSelectWallet = async (provider: WalletProvider) => {
    setSelectedProvider(provider);
    const pending = await initiateConnection(provider);
    setPendingConnection(pending);
    setEmojiGrid(hashToEmoji(pending.verificationHash));
    setPhase('verifying');
  };

  // Handle emoji verification confirmation
  const handleVerifyEmojis = async () => {
    if (!pendingConnection || !selectedProvider) return;

    const wallet = await confirmConnection(selectedProvider, pendingConnection);

    // Request capabilities to get accounts
    const capabilities = await wallet.requestCapabilities(manifest);
    const accountsCap = capabilities.granted.find(
      (c): c is GrantedAccountsCapability => c.type === 'accounts'
    );

    if (accountsCap?.accounts.length) {
      setAccounts(accountsCap.accounts);
      setPhase('selecting-account');
    }
  };

  // Handle emoji mismatch (cancel)
  const handleRejectEmojis = () => {
    pendingConnection?.cancel();
    setPendingConnection(null);
    setPhase('discovering');
  };

  // Handle account selection
  const handleSelectAccount = (address: AztecAddress) => {
    setCurrentAddress(address);
    setPhase('connected');
  };

  // Render based on current phase
  switch (phase) {
    case 'discovering':
      return (
        <div>
          <h2>Connect Wallet</h2>
          <p>Looking for wallets...</p>
          {discoveredWallets.map(w => (
            <button key={w.id} onClick={() => handleSelectWallet(w)}>
              {w.icon && <img src={w.icon} alt="" />}
              {w.name}
            </button>
          ))}
        </div>
      );

    case 'verifying':
      return (
        <div>
          <h2>Verify Connection</h2>
          <p>Confirm these emojis match your wallet:</p>
          <div className="emoji-grid">
            {/* Display as 3x3 grid */}
            {Array.from(emojiGrid).map((emoji, i) => (
              <span key={i} className="emoji-cell">{emoji}</span>
            ))}
          </div>
          <button onClick={handleVerifyEmojis}>They Match</button>
          <button onClick={handleRejectEmojis}>They Don't Match</button>
        </div>
      );

    case 'selecting-account':
      return (
        <div>
          <h2>Select Account</h2>
          {accounts.map(account => (
            <button key={account.toString()} onClick={() => handleSelectAccount(account)}>
              {account.alias ?? `${account.toString().slice(0, 10)}...`}
            </button>
          ))}
        </div>
      );

    case 'connected':
      return null; // Close modal
  }
}
```

---

## Capability Manifest Reference

The capability manifest is how dApps declare **upfront** what permissions they need. This reduces per-operation authorization popups from many to just one initial dialog.

### Capability Types

| Type | Purpose | Wallet Methods |
|------|---------|---------------|
| `accounts` | Access user accounts | `getAccounts()`, `createAuthWit()` |
| `contracts` | Register/query contracts | `registerContract()`, `getContractMetadata()` |
| `contractClasses` | Query contract class metadata | `getContractClassMetadata()` |
| `simulation` | Simulate transactions/utilities | `simulateTx()`, `simulateUtility()`, `profileTx()` |
| `transaction` | Send transactions | `sendTx()` |
| `data` | Access private data | `getAddressBook()`, `getPrivateEvents()` |

### Scoping with ContractFunctionPattern

```typescript
// Allow any function on a specific contract
{ contract: ammAddress, function: '*' }

// Allow a specific function on a specific contract
{ contract: tokenAddress, function: 'transfer' }

// Allow a function on any contract
{ contract: '*', function: 'balance_of_private' }
```

### Full Manifest Example (DEX App)

```typescript
const manifest: AppCapabilities = {
  version: '1.0',
  metadata: {
    name: 'MyDEX',
    version: '1.0.0',
    description: 'Decentralized exchange on Aztec',
    url: 'https://mydex.example.com',
  },
  capabilities: [
    // Account access
    { type: 'accounts', canGet: true, canCreateAuthWit: true },

    // Contract registration
    {
      type: 'contracts',
      contracts: [ammAddress, tokenAAddress, tokenBAddress, fpcAddress],
      canRegister: true,
      canGetMetadata: true,
    },

    // Simulation (auto-approved after initial grant)
    {
      type: 'simulation',
      utilities: {
        scope: [
          { contract: tokenAAddress, function: 'balance_of_private' },
          { contract: tokenBAddress, function: 'balance_of_private' },
        ],
      },
      transactions: {
        scope: [
          { contract: tokenAAddress, function: 'balance_of_public' },
          { contract: tokenBAddress, function: 'balance_of_public' },
        ],
      },
    },

    // Transaction execution (per-tx approval still required)
    {
      type: 'transaction',
      scope: [
        { contract: ammAddress, function: 'swap_tokens_for_exact_tokens' },
        { contract: ammAddress, function: 'add_liquidity' },
      ],
    },

    // Data access
    {
      type: 'data',
      addressBook: true,
      privateEvents: {
        contracts: [ammAddress],
      },
    },
  ],
};
```

### Capability Manifest Design Guide

#### Versioning

The manifest has a single **top-level** `version` field — only `'1.0'` is currently supported. Individual capabilities do **not** have their own version fields.

```typescript
{
  version: '1.0' as const,  // Manifest format version (only '1.0' supported)
  metadata: {
    name: 'My App',         // What the wallet shows in its permission dialog
    version: '1.0.0',       // Your app version (informational only)
    // ...
  },
}
```

The `typeof CAPABILITY_VERSION` type enforces the literal `'1.0'` — passing any other string is a type error. Import the constant if you prefer:

```typescript
import { CAPABILITY_VERSION } from '@aztec/aztec.js/wallet';
// version: CAPABILITY_VERSION
```

#### `metadata.name` Is Your dApp's Identity

The `metadata.name` is what the wallet displays in its permission dialog and session list. This is how users identify your app — use your product name (e.g., "Human Tech"), not an internal ID (e.g., "aztec-bridge"). The same name should match the `appId` passed to `establishSecureChannel()` / `discoverWallets()`.

#### Build Manifests Dynamically from Config

When contract addresses come from environment config (e.g., different addresses per deployment), build the manifest programmatically instead of hardcoding addresses. This prevents the manifest from drifting when tokens or contracts are added:

```typescript
import { L1_TOKENS } from '@/config'

export function buildCapabilityManifest() {
  const tokenAddresses = L1_TOKENS
    .map(t => t.l2TokenContract)
    .filter((addr): addr is string => !!addr)
    .map(addr => AztecAddress.fromString(addr))

  const bridgeAddresses = L1_TOKENS
    .map(t => t.l2BridgeContract)
    .filter((addr): addr is string => !!addr)
    .map(addr => AztecAddress.fromString(addr))

  return {
    version: '1.0' as const,
    metadata: { /* ... */ },
    capabilities: [
      { type: 'accounts', canGet: true, canCreateAuthWit: true },
      {
        type: 'contracts',
        contracts: [...tokenAddresses, ...bridgeAddresses],
        canRegister: true,
      },
      {
        type: 'simulation',
        utilities: {
          scope: tokenAddresses.flatMap(addr => [
            { contract: addr, function: 'balance_of_private' },
          ]),
        },
        transactions: {
          scope: tokenAddresses.flatMap(addr => [
            { contract: addr, function: 'balance_of_public' },
          ]),
        },
      },
      {
        type: 'transaction',
        scope: [
          ...tokenAddresses.flatMap(addr => [
            { contract: addr, function: 'transfer' },
            { contract: addr, function: 'burn_public' },
          ]),
          ...bridgeAddresses.flatMap(addr => [
            { contract: addr, function: 'exit_to_l1_public' },
          ]),
        ],
      },
    ],
  }
}
```

#### Least-Privilege: Scope Functions, Not Wildcards

Prefer `{ contract: addr, function: 'transfer' }` over `{ contract: addr, function: '*' }`. Scoped patterns give the wallet user a clear picture of what the app can do and limit blast radius if the dApp is compromised. The wallet displays each scoped function by name in its permission dialog, which builds user trust.

Reserve wildcards (`'*'`) only for development/testing. In production, enumerate every function your app calls.

#### `canCreateAuthWit` — Only When You Need Cross-Contract Calls

Set `canCreateAuthWit: true` on the accounts capability **only** if your app creates authorization witnesses (e.g., allowing a bridge contract to call `token.burn_public` on the user's behalf). Most read-only or simple transfer dApps don't need this. Requesting it when unnecessary makes the permission dialog look more invasive.

#### Fallback: `requestCapabilities()` → `getAccounts()`

Not all wallets may support `requestCapabilities()` yet. Always fall back to `getAccounts()` for account discovery:

```typescript
let accounts = []
try {
  const capabilities = await wallet.requestCapabilities(manifest)
  const accountsCap = capabilities.granted.find(c => c.type === 'accounts')
  accounts = accountsCap?.accounts ?? []
} catch {
  console.warn('requestCapabilities not supported, falling back to getAccounts')
}

if (accounts.length === 0) {
  accounts = await wallet.getAccounts()
}
```

This ensures compatibility with wallets that haven't implemented the capability protocol. The app still works — it just won't get pre-authorized permissions and may see more per-operation popups.

#### The Capability Response Tells You What Was Actually Granted

`requestCapabilities()` returns `WalletCapabilities` with a `granted` array. The wallet may grant a **subset** of what you requested (e.g., user deselected some accounts, or the wallet doesn't support data access). Always check what was actually granted rather than assuming your full request was approved:

```typescript
const capabilities = await wallet.requestCapabilities(manifest)

// Check what simulation scope was actually granted
const simCap = capabilities.granted.find(c => c.type === 'simulation')
if (!simCap?.utilities?.scope?.length) {
  console.warn('Simulation not granted — balance queries will prompt per-call')
}
```

---

## Wallet Interface Methods (Complete Reference)

Once connected, the `Wallet` object exposes these methods:

### Account & Authorization

```typescript
// Get all accounts the wallet has granted access to
const accounts: Aliased<AztecAddress>[] = await wallet.getAccounts();

// Request capabilities (permissions) from the wallet
const capabilities: WalletCapabilities = await wallet.requestCapabilities(manifest);

// Create an authorization witness (for cross-contract calls)
const authWit: AuthWitness = await wallet.createAuthWit(fromAddress, messageHashOrIntent);

// Get the wallet's address book (aliased addresses)
const addressBook: Aliased<AztecAddress>[] = await wallet.getAddressBook();

// Get chain info
const chainInfo: ChainInfo = await wallet.getChainInfo();
```

### Transaction Execution

```typescript
// Send a transaction
const receipt = await wallet.sendTx(executionPayload, {
  from: accountAddress,
  // Optional: wait options
});

// Simulate a transaction (dry run)
const simResult = await wallet.simulateTx(executionPayload, {
  from: accountAddress,
});

// Profile a transaction (detailed gas/timing info)
const profileResult = await wallet.profileTx(executionPayload, {
  from: accountAddress,
});

// Simulate a utility function (unconstrained / view call)
const result = await wallet.simulateUtility(functionCall, {
  from: accountAddress,
});

// Batch multiple operations
const batchResults = await wallet.batch([method1, method2, method3]);
```

### Contract Management

```typescript
// Register a contract (instance + optional artifact)
await wallet.registerContract(contractInstance, contractArtifact);

// Register a sender for auth witnesses
await wallet.registerSender(address, 'optional-alias');

// Get contract metadata
const metadata = await wallet.getContractMetadata(contractAddress);

// Get contract class metadata
const classMetadata = await wallet.getContractClassMetadata(classId);
```

### Events

```typescript
// Get private events from a contract
const events = await wallet.getPrivateEvents(eventMetadataDefinition, {
  from: blockNumber,
  to: blockNumber,
});
```

---

## PART 2: Wallet Extension Development

This section covers building a wallet that implements the provider side of the protocol.

### Content Script (Pure Relay)

The content script should be a minimal relay with no business logic:

```typescript
// content-script.ts
import { ContentScriptConnectionHandler } from '@aztec/wallet-sdk/extension/handlers';

const handler = new ContentScriptConnectionHandler({
  sendToBackground: (message) => browser.runtime.sendMessage(message),
  addBackgroundListener: (listener) => {
    browser.runtime.onMessage.addListener(listener);
  },
});

handler.start();
```

### Background Script (Connection Handler)

The background script manages discovery, sessions, and message routing:

```typescript
// background.ts
import {
  BackgroundConnectionHandler,
  type BackgroundConnectionConfig,
  type BackgroundTransport,
  type BackgroundConnectionCallbacks,
  type PendingDiscovery,
  type ActiveSession,
} from '@aztec/wallet-sdk/extension/handlers';
import type { WalletMessage, WalletResponse } from '@aztec/wallet-sdk/types';

// Configure your wallet identity
const config: BackgroundConnectionConfig = {
  walletId: 'my-wallet',
  walletName: 'My Wallet',
  walletVersion: '1.0.0',
  walletIcon: chrome.runtime.getURL('icon.png'),
};

// Set up transport layer
const transport: BackgroundTransport = {
  sendToTab: (tabId, message) => {
    chrome.tabs.sendMessage(tabId, message);
  },
  addContentListener: (handler) => {
    chrome.runtime.onMessage.addListener((message, sender) => {
      handler(message, { tabId: sender.tab?.id });
    });
  },
};

// Define callbacks for wallet events
const callbacks: BackgroundConnectionCallbacks = {
  onPendingDiscovery: (discovery: PendingDiscovery) => {
    // A dApp wants to connect
    // Show notification badge, open popup, etc.
    console.log(`Connection request from ${discovery.origin} (app: ${discovery.appId})`);

    // Auto-approve or show UI for user approval:
    handler.approveDiscovery(discovery.requestId);
    // OR: handler.rejectDiscovery(discovery.requestId);
  },

  onSessionEstablished: (session: ActiveSession) => {
    // ECDH key exchange complete, encrypted channel ready
    // Show verification hash to user
    console.log(`Session established: ${session.sessionId}`);
    console.log(`Verification hash: ${session.verificationHash}`);
  },

  onSessionTerminated: (sessionId: string) => {
    // Session ended (dApp disconnected or tab closed)
    console.log(`Session terminated: ${sessionId}`);
  },

  onWalletMessage: async (session: ActiveSession, message: WalletMessage) => {
    // Decrypted message from dApp received
    // Route to your wallet logic and send response
    try {
      const result = await handleWalletMethod(message.type, message.args, session);
      const response: WalletResponse = {
        messageId: message.messageId,
        result,
        walletId: config.walletId,
      };
      await handler.sendResponse(session.sessionId, response);
    } catch (error) {
      const response: WalletResponse = {
        messageId: message.messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
        walletId: config.walletId,
      };
      await handler.sendResponse(session.sessionId, response);
    }
  },
};

// Create and initialize handler
const handler = new BackgroundConnectionHandler(config, transport, callbacks);
handler.initialize();

// Management APIs
handler.getPendingDiscoveries();    // List pending connection requests
handler.getActiveSessions();        // List active encrypted sessions
handler.getSession(sessionId);      // Get specific session
handler.terminateSession(sessionId); // Disconnect a session
handler.terminateForTab(tabId);     // Disconnect all sessions from a tab
handler.clearAll();                 // Disconnect everything
```

### Implementing BaseWallet (Wallet Logic)

For the actual wallet operations, extend `BaseWallet`:

```typescript
// wallet-implementation.ts
import { BaseWallet } from '@aztec/wallet-sdk/base-wallet';
import type { PXE } from '@aztec/aztec.js/interfaces';
import type { AztecNode } from '@aztec/aztec.js/node';
import type { Account } from '@aztec/aztec.js/account';
import type { AztecAddress, Aliased } from '@aztec/aztec.js/addresses';

class MyWallet extends BaseWallet {
  private accounts: Map<string, Account> = new Map();

  constructor(pxe: PXE, node: AztecNode) {
    super(pxe, node);
  }

  // Required: resolve address to account (for signing)
  protected async getAccountFromAddress(address: AztecAddress): Promise<Account> {
    const account = this.accounts.get(address.toString());
    if (!account) throw new Error(`Account not found: ${address}`);
    return account;
  }

  // Required: list available accounts
  async getAccounts(): Promise<Aliased<AztecAddress>[]> {
    return Array.from(this.accounts.entries()).map(([addr, _]) => ({
      address: AztecAddress.fromString(addr),
      alias: 'My Account',  // Optional human-readable name
    }));
  }
}
```

---

## Emoji Verification System

The SDK includes a 256-emoji alphabet for visual MITM verification.

```typescript
import { hashToEmoji, DEFAULT_EMOJI_GRID_SIZE } from '@aztec/wallet-sdk/crypto';

// Convert verification hash to emojis
const emojis = hashToEmoji(verificationHash);
// Returns 9 emojis (DEFAULT_EMOJI_GRID_SIZE = 9) for a 3x3 grid

// Custom grid size
const smallGrid = hashToEmoji(verificationHash, 4);  // 2x2 grid

// Display as grid (CSS)
// .emoji-grid {
//   display: grid;
//   grid-template-columns: repeat(3, 1fr);
//   gap: 8px;
//   font-size: 2rem;
// }
```

**Security**: 9 emojis from a 256-character alphabet = 72 bits of entropy, making brute-force infeasible.

---

## Error Handling Best Practices

```typescript
// Connection errors
try {
  const pending = await provider.establishSecureChannel('my-app');
} catch (error) {
  if (error.message.includes('timeout')) {
    // Wallet didn't respond in time
  } else if (error.message.includes('rejected')) {
    // Wallet rejected the connection
  }
}

// Transaction errors
try {
  const receipt = await wallet.sendTx(payload, opts);
} catch (error) {
  if (error.message.includes('Simulation failed')) {
    // Transaction would revert - show simulation error
  } else if (error.message.includes('User denied') || error.message.includes('rejected')) {
    // User rejected in wallet
  } else if (error.message.includes('Insufficient')) {
    // Not enough balance/gas
  }
}

// Disconnection handling
provider.onDisconnect(() => {
  // Always handle unexpected disconnects gracefully
  // Reset state, show reconnect UI, etc.
});
```

---

## Key Patterns from Reference Implementation

### 1. Context Layering (Recommended)

```
NetworkProvider          ← Network selection
  └── WalletProvider     ← Wallet instance & connection state
    └── ContractsProvider ← Contract registration & interaction
      └── AppProvider     ← App-specific logic
```

### 2. Refs for Provider Cleanup

Always use refs for disconnect unsubscribe functions to avoid stale closures:

```typescript
const disconnectUnsubRef = useRef<(() => void) | null>(null);

// On connect
disconnectUnsubRef.current = provider.onDisconnect(handleDisconnect);

// On disconnect or unmount
disconnectUnsubRef.current?.();
disconnectUnsubRef.current = null;
```

### 3. Discovery as Streaming

Show wallets to users as they're discovered rather than waiting for the timeout:

```typescript
const discovery = discoverWallets(chainInfo);

// Stream results to UI
for await (const provider of discovery.wallets) {
  updateUI(prev => [...prev, provider]);
}
```

### 4. Always Offer Embedded Wallet Fallback

Show an "Continue without wallet" option while discovering wallets:

```typescript
// While discovering external wallets, show embedded option
<button onClick={useEmbeddedWallet}>Continue without external wallet</button>

// Meanwhile, discovered wallets appear as they respond
{discoveredWallets.map(w => <WalletOption key={w.id} wallet={w} />)}
```

---

## Architecture & UX Patterns (from production dApps)

These patterns emerged from building production dApps and represent non-obvious architectural decisions that save significant debugging time.

### 1. The Connection Lifecycle is Six Distinct Phases

A common mistake is treating connection as binary (disconnected/connected). In practice, the UI needs to handle **six distinct phases** to avoid confusing UX:

```typescript
type WalletConnectionPhase =
  | 'idle'           // No connection in progress
  | 'discovering'    // Broadcasting discovery, waiting for wallets
  | 'selecting'      // Multiple wallets found, user picks one
  | 'verifying'      // Emoji grid shown, awaiting user confirmation
  | 'requesting'     // Channel confirmed, requestCapabilities() in flight
  | 'account-select' // Capabilities granted, user picks which account
  | 'connected'      // Ready to transact
```

Each phase needs its own UI treatment. The `requesting` phase in particular needs a spinner — `requestCapabilities()` can take several seconds while the wallet shows its permission dialog.

### 2. Separate Channel Verification from Account Selection

**Wrong:** Emoji verification → extract account → done (conflates security with selection)
**Right:** Emoji verification → request capabilities → parse accounts → let user choose

The emoji grid verifies the **secure channel** (anti-MITM), not the account. After verification:
1. Call `wallet.requestCapabilities(manifest)` — this is where the wallet shows its permission/account dialog
2. Parse the granted accounts from the capability response
3. If 1 account → auto-select (no extra UI, seamless)
4. If >1 accounts → show account selector modal

This separation means **account switching never re-verifies** — the `Wallet` session persists, only the adapter rebuilds.

### 3. Simulation Capabilities: utility vs transaction Scope

The wallet-sdk classifies simulations by whether they touch **public state**:

| Function | Simulation Type | Manifest Location | Why |
|----------|----------------|-------------------|-----|
| `balance_of_private` | Utility | `simulation.utilities.scope` | Reads private state only, no transaction context |
| `balance_of_public` | Transaction | `simulation.transactions.scope` | Reads public state, needs transaction context |

**Common mistake:** Putting all balance queries under `simulation.utilities`. The wallet will reject `balance_of_public` as unauthorized because it's classified as a transaction simulation internally.

```typescript
// WRONG — balance_of_public will fail
{
  type: 'simulation',
  utilities: {
    scope: [
      { contract: tokenAddress, function: 'balance_of_private' },
      { contract: tokenAddress, function: 'balance_of_public' },  // Wrong scope!
    ],
  },
}

// RIGHT — split by state type
{
  type: 'simulation',
  utilities: {
    scope: [
      { contract: tokenAddress, function: 'balance_of_private' },
    ],
  },
  transactions: {
    scope: [
      { contract: tokenAddress, function: 'balance_of_public' },
    ],
  },
}
```

**Rule of thumb:** Private functions → utility scope. Public functions (marked `[pub]`) → transaction scope.

### 4. Disconnect Handler Grace Period (HMR/Fast Refresh)

In development, HMR/Fast Refresh can trigger false disconnect events from the wallet provider. Add a grace period before treating disconnects as real:

```typescript
const DISCONNECT_GRACE_MS = 1000

provider.onDisconnect(() => {
  setTimeout(() => {
    if (provider.isDisconnected?.()) {
      // Actually disconnected — reset state
      disconnectWallet()
    }
    // Otherwise it was a false positive from HMR
  }, DISCONNECT_GRACE_MS)
})
```

### 5. Wallet Adapter Cache Invalidation via Query Key

When using React Query (or similar) to cache wallet adapters, include the **account address** in the query key. This way, switching accounts automatically invalidates the old adapter and rebuilds with the new account — no manual cache clearing needed:

```typescript
const { data: adapter } = useQuery({
  queryKey: ['walletAdapter', loginMethod, !!sdkWallet, accountAddress],
  queryFn: () => createWalletAdapter(context),
  enabled: !!loginMethod && !!sdkWallet,
  staleTime: Infinity,
})
```

### 6. Use Selected Account in Adapter, Not `getAccounts()[0]`

**Wrong:** `createWalletAdapter()` calls `wallet.getAccounts()` and blindly uses `[0]`. This ignores the user's account selection and breaks multi-account wallets.

**Right:** Pass the already-selected account address through context:

```typescript
export async function createWalletAdapter(context: WalletContext) {
  // Use the store's selected account, not getAccounts()[0]
  let account: AztecAddress
  if (context.aztecAccount?.address) {
    account = AztecAddress.fromString(context.aztecAccount.address.toString())
  } else {
    // Fallback only — shouldn't happen in normal flow
    const accounts = await context.sdkWallet.getAccounts()
    account = 'item' in accounts[0] ? accounts[0].item : accounts[0]
  }
  // ... build adapter with explicit account
}
```

### 7. Account Switching UX: Inline in Dropdown, Not a Modal

For switching accounts after initial connection, listing accounts directly in the wallet's header dropdown is better UX than opening a separate modal. A modal needs careful positioning (it's outside the main content area) and adds an unnecessary interaction layer. The dropdown is contextual and immediate.

### 8. Guard Against Concurrent Flow Operations

Discovery and confirmation are async and can be triggered multiple times (double-click, HMR replay, React strict mode). Use module-level guards:

```typescript
let isDiscoveryInProgress = false
let isConfirmInProgress = false

startDiscovery: async () => {
  if (isDiscoveryInProgress) return
  isDiscoveryInProgress = true
  try { /* ... */ } finally { isDiscoveryInProgress = false }
},

confirmConnection: async () => {
  if (isConfirmInProgress) return
  isConfirmInProgress = true
  try { /* ... */ } finally { isConfirmInProgress = false }
},
```

---

## Migration from Azguard SDK

If you're migrating from `@azguardwallet/client` to `@aztec/wallet-sdk`, see the companion migration guide (`migration-from-azguard.md`) for a detailed side-by-side mapping of every API call.

### Key Conceptual Differences

| Concept | Azguard (`@azguardwallet/client`) | Wallet SDK (`@aztec/wallet-sdk`) |
|---------|-------------------------------------|----------------------------------|
| **Detection** | `window.azguard` injection | `window.postMessage` broadcast discovery |
| **Connection** | `AzguardClient.create()` + `.connect()` | `WalletManager.configure()` + discovery + ECDH + emoji verification |
| **Security** | ECDH P-521 + AES-GCM (inpage) | ECDH P-256 + AES-GCM (full channel) + emoji MITM verification |
| **Accounts** | CAIP-10 strings (`aztec:chainId:address`) | `AztecAddress` objects with `Aliased<>` (has `.alias`) |
| **Permissions** | `connect(metadata, permissions)` | `wallet.requestCapabilities(manifest)` (richer, per-function scope) |
| **Transactions** | `azguard.execute([{ kind: 'send_transaction', ... }])` | `wallet.sendTx(payload, opts)` or `contract.methods.foo().send()` |
| **Simulation** | `azguard.execute([{ kind: 'simulate_views', ... }])` | `wallet.simulateUtility(call, opts)` |
| **Events** | `onConnected`, `onDisconnected`, `onAccountsChanged` | `provider.onDisconnect(callback)` (per-provider) |
| **Batching** | Array of operations in `execute()` | `wallet.batch([...])` |
| **Session** | Stored in `localStorage` with scope | Managed by wallet extension |
| **Wallet interface** | Custom RPC (`execute` with operation objects) | Standard `Wallet` interface from `@aztec/aztec.js` |
| **Contract calls** | `{ kind: 'call', contract, method, args }` | `contract.methods.functionName(args).send()` |
| **Auth witnesses** | `{ kind: 'add_private_authwit', content: {...} }` as an action | `wallet.createAuthWit(from, intent)` |
| **Contract registration** | `{ kind: 'register_contract', chain, address }` as an operation | `wallet.registerContract(instance, artifact)` |

---

## Common Bridge Patterns (L1-L2)

Many Aztec dApps are bridges. Here are the key wallet-sdk patterns for bridge flows, based on production implementations (Raven Bridge, Holonym).

### L1 to L2 Claim (after depositing on L1)

```typescript
// After L1 deposit is confirmed and L2 has synced the message:
const bridge = await Contract.at(bridgeAddress, BridgeArtifact, wallet);

const receipt = await bridge.methods
  .claim_public(          // or claim_private for private deposits
    recipientAddress,     // AztecAddress of recipient on L2
    amount,               // bigint
    claimSecret,          // Fr - generated during L1 deposit
    messageLeafIndex,     // bigint - from L1 deposit receipt
  )
  .send({ from: accountAddress })
  .wait();
```

### L2 to L1 Exit (Burn + Withdraw)

This requires an auth witness because the bridge contract calls `burn_public` on the token contract on behalf of the user:

```typescript
import { Fr } from '@aztec/aztec.js/fields';

const token = await Contract.at(tokenAddress, TokenArtifact, wallet);
const bridge = await Contract.at(bridgeAddress, BridgeArtifact, wallet);

// Generate a unique nonce for the auth witness
const authwitNonce = Fr.random();

// Create auth witness allowing bridge to burn tokens
await wallet.createAuthWit(accountAddress, {
  caller: bridgeAddress,
  action: token.methods.burn_public(accountAddress, amount, authwitNonce),
});

// Execute the exit (bridge will call burn_public internally)
const receipt = await bridge.methods
  .exit_to_l1_public(
    l1RecipientAddress,   // EthAddress on L1
    amount,               // bigint
    EthAddress.ZERO,      // callerOnL1 (zero for portal)
    authwitNonce,         // Must match the authwit nonce
  )
  .send({ from: accountAddress })
  .wait();

// After L2 tx is proven, withdraw on L1 using the L1 portal contract
```

### Waiting for Block Sync / Proof

```typescript
import { createAztecNodeClient } from '@aztec/aztec.js/node';

const node = createAztecNodeClient(nodeUrl);

// Wait for L2 to sync L1 messages (for L1→L2 claims)
let synced = false;
while (!synced) {
  const messageBlock = await node.getL1ToL2MessageBlock(messageHashFr);
  if (messageBlock !== undefined) synced = true;
  else await new Promise(r => setTimeout(r, 5000));
}

// Wait for block to be proven (for L2→L1 withdrawals)
const minedBlock = receipt.blockNumber;
let provenBlock = await node.getProvenBlockNumber();
while (provenBlock < minedBlock) {
  await new Promise(r => setTimeout(r, 5000));
  provenBlock = await node.getProvenBlockNumber();
}
```

---

## Gotchas & Lessons Learned (from real integration)

### ChainInfo: correct values AND correct types

`ChainInfo` has two pitfalls — wrong **types** and wrong **values**:

**Types**: `ChainInfo` expects `{ chainId: Fr, version: Fr }`, not numbers or Promises. You must wrap in `Fr`:

```typescript
// WRONG — passes Promise objects, wallet sees "[object Object]"
const chainInfo = { chainId: node.getChainId(), version: node.getVersion() };

// WRONG — passes numbers, wallet may reject or misinterpret
const chainInfo = { chainId: await node.getChainId(), version: await node.getVersion() };

// CORRECT
const [chainId, version] = await Promise.all([node.getChainId(), node.getVersion()]);
const chainInfo = { chainId: new Fr(chainId), version: new Fr(version) };
```

**Values**: `chainId` is the **L1 chain ID** (e.g. `11155111` for Sepolia), NOT the L2/Aztec chain ID. `version` is the **rollup version** (e.g. `615022430` for devnet), NOT `0` or an arbitrary value. These must match what the wallet extension expects — mismatched values cause wallets to silently ignore discovery broadcasts or fail to connect.

```typescript
// WRONG — L2 chain ID, not L1
const chainInfo = { chainId: new Fr(604129785), version: new Fr(0) };

// CORRECT — L1 chain ID + rollup version from deployments config
import { L1_CHAIN_ID, ROLLUP_VERSION } from '@/config';
const chainInfo = { chainId: new Fr(L1_CHAIN_ID), version: new Fr(ROLLUP_VERSION) };
// e.g. L1_CHAIN_ID = 11155111 (Sepolia), ROLLUP_VERSION = 615022430
```

If you have access to an Aztec node, you can fetch these dynamically:
```typescript
const nodeInfo = await node.getNodeInfo();
const chainInfo = { chainId: new Fr(nodeInfo.l1ChainId), version: new Fr(nodeInfo.rollupVersion) };
```

### Account objects: handle multiple shapes

`wallet.getAccounts()` and `requestCapabilities` granted accounts can return different object shapes depending on the wallet implementation:
- `AztecAddress` instances (have `.toHexString()`)
- `CompleteAddress` objects (have `.address` property)
- `Aliased<AztecAddress>` with `.item` — e.g. `{ alias: "main account", item: AztecAddress }` (Aztec Keychain). **Note**: `.item` is an `AztecAddress` object, NOT a string — even though `JSON.stringify()` shows it as a hex string (via `toJSON()`).
- `Aliased<AztecAddress>` with `.address` — e.g. `{ alias: "...", address: AztecAddress }`
- Raw hex strings

**Critical**: `AztecAddress`/`Fr` objects have `toJSON()` → hex string, but `toString()` → `"[object Object]"`. Never use string interpolation or `String()` directly. Always use `toHexString()`:

```typescript
// Extract a displayable hex address from any account shape
function extractAddress(a: any): string {
  if (typeof a === 'string') return a;
  if (typeof a?.toHexString === 'function') return a.toHexString();
  // Aliased wrappers: .item or .address are AztecAddress objects, not strings
  const inner = a?.item ?? a?.address;
  if (inner) return extractAddress(inner);
  return String(a);
}
```

### `requestCapabilities` MUST be the primary flow for external wallets

**Critical**: After `confirm()`, call `requestCapabilities()` FIRST — not `getAccounts()` directly. External wallets (like Aztec Keychain / demo-wallet) expect the capabilities-first flow:

- `requestCapabilities()` shows a **single comprehensive dialog** where the user selects accounts AND grants simulation/transaction permissions. The account selection is properly packaged and persisted.
- `getAccounts()` directly triggers a **bare standalone authorization dialog** that has bugs — particularly with multi-account wallets, it fails with `"Authorization response missing account data"` because the dialog doesn't properly package the account selection into the response.

The capabilities-first flow also reduces authorization friction: subsequent `simulateTx`, `sendTx`, etc. calls are auto-approved based on the granted capabilities instead of showing individual permission dialogs.

Always wrap `requestCapabilities` with a fallback to `getAccounts` for wallets that don't support it.

**Best practice: use scoped capabilities** — declare exactly which contract functions your app needs instead of wildcards. This gives users a clear picture of permissions and limits blast radius. See the DEX example above for the recommended pattern. Use `ContractFunctionPattern` (`{ contract: AztecAddress, function: string }`) for each allowed function — one entry per function, not a methods array.

```typescript
const wallet = await pendingConnection.confirm();

// Primary flow: request scoped capabilities (accounts + specific permissions)
let accounts: Aliased<AztecAddress>[] = [];
try {
  const capabilities = await wallet.requestCapabilities({
    version: '1.0' as const,
    metadata: {
      name: 'My App',
      version: '1.0.0',
      description: 'App description',
      url: window.location.origin,
    },
    capabilities: [
      { type: 'accounts', canGet: true, canCreateAuthWit: true },
      // Scope to the specific contracts your app interacts with
      { type: 'contracts', contracts: [tokenAddress, bridgeAddress], canRegister: true },
      {
        type: 'simulation',
        utilities: {
          scope: [
            { contract: tokenAddress, function: 'balance_of_private' },
            { contract: tokenAddress, function: 'balance_of_public' },
          ],
        },
      },
      {
        type: 'transaction',
        scope: [
          { contract: tokenAddress, function: 'transfer' },
          { contract: bridgeAddress, function: 'claim_public' },
        ],
      },
    ],
  });
  const accountsCap = capabilities.granted.find(
    (c: { type: string }) => c.type === 'accounts'
  ) as GrantedAccountsCapability | undefined;
  accounts = accountsCap?.accounts ?? [];
} catch (err) {
  console.warn('requestCapabilities failed, falling back to getAccounts:', err);
}

// Fallback for wallets that don't support capabilities
if (accounts.length === 0) {
  accounts = await wallet.getAccounts();
}
```

> **Note on wildcards**: The SDK types accept `'*'` as `scope` value for simulation/transaction capabilities (e.g. `scope: '*'`), but scoped patterns are strongly preferred for production apps. Only use wildcards during prototyping.

### Don't send empty `contracts` array in capabilities

Sending `{ type: 'contracts', contracts: [] }` can cause internal SDK errors. Only include the `contracts` capability when you have actual contract addresses to register.

### `WalletProvider.icon` may be undefined

Not all wallet extensions provide an icon. Always guard:

```typescript
if (provider.icon) {
  iconEl.src = provider.icon;
  iconEl.classList.remove('hidden');
}
```

### Show "Connect External" button early

Don't gate the external wallet button on embedded wallet readiness. External wallets bring their own PXE — they work independently of the Aztec node. Show the button as soon as the page loads (or after service checks), not after embedded wallet init succeeds.

### Discovery timing: connect immediately, don't wait for full timeout

**Critical**: Do NOT `for await` over `discovery.wallets` and then connect — by the time the full discovery timeout expires (5-10s), the provider's key exchange state is stale and `establishSecureChannel()` will fail with "Key exchange timeout".

Instead, use the `onWalletDiscovered` callback to connect as soon as the wallet is found:

```typescript
// WRONG — waits full timeout, provider goes stale
const discovery = discoverWallets({ timeout: 10000, onWalletDiscovered: (p) => wallets.push(p) });
for await (const provider of discovery.wallets) { allProviders.push(provider); }
// By now, 10 seconds have passed — key exchange will timeout
await selectWallet(allProviders[0]);

// CORRECT — connect ~1s after wallet is discovered
const result = await new Promise<WalletProvider[]>((resolve) => {
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  discoverWallets({
    timeout: 5000,
    onWalletDiscovered: (provider) => {
      wallets.push(provider);
      // Short grace period for additional wallets, then resolve
      if (graceTimer) clearTimeout(graceTimer);
      graceTimer = setTimeout(() => resolve(wallets.map(w => w.provider)), 1000);
    },
  });
  // Fallback if no wallets found
  setTimeout(() => resolve([]), 6000);
});
await selectWallet(result[0]); // connects immediately while provider is fresh
```

### COOP/COEP headers required for `Contract.at()` and `.simulate()`

`Contract.at(addr, artifact, wallet).methods.fn().simulate()` needs **Barretenberg WASM locally** for function selector hashing and ABI encoding — even though the actual simulation runs in the wallet extension. The WASM binary uses threading/atomics that require `SharedArrayBuffer`, which is only available in cross-origin isolated contexts.

Add these headers to your web server (Next.js `headers()`, Vite `server.headers`, etc.):

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

Use `credentialless` (not `require-corp`) for COEP to allow cross-origin iframes (e.g., WaaP/WalletConnect iframes) to load.

**Note**: `COOP: same-origin` may break popup-based auth flows (Google login, social login) because `window.opener` is nullified for cross-origin popups. If your app uses popup-based L1 wallet auth, test this carefully.

**Critical**: `COOP: same-origin` also **breaks cross-origin iframe communication via `postMessage`**. If your app embeds an L1 wallet via iframe (e.g., WaaP/Silk at `waap.xyz`), the iframe's `postMessage` calls will be silently blocked, causing "Wallet ping timed out" errors. On localhost, SharedArrayBuffer works without COOP headers (browsers enable it automatically for `localhost`). For production, you need an alternative strategy: either a service worker proxy to enable cross-origin isolation without COOP, or isolating the Barretenberg WASM in its own cross-origin-isolated iframe.

**Without these headers**: `Contract.at()` calls crash with `proc_exit` in `BarretenbergWasmMain.init` → `BarretenbergSync.new`. The error looks like:
```
Error at proc_exit (index.js:37:27)
  at BarretenbergWasmMain.init → BarretenbergWasmSyncBackend.new → BarretenbergSync.new
```

### Register contracts with PXE before simulate/send

The wallet extension's PXE does not know about your app's contracts until you register them. Without registration, you'll get:
```
Unknown contract 0x...: add it to PXE by calling server.addContracts(...)
```

Fetch the `ContractInstanceWithAddress` from the Aztec node, then register with the wallet:

```typescript
import { aztecNode } from './aztec'; // createAztecNodeClient(nodeUrl)

async function registerContractWithWallet(
  wallet: Wallet,
  address: AztecAddress,
  artifact: ContractArtifact,
) {
  const instance = await aztecNode.getContract(address);
  if (instance) {
    await wallet.registerContract(instance, artifact);
  }
}
```

Do this **once** during adapter initialization — not on every call. Good pattern: register token + bridge contracts when the wallet adapter is first created, cache the adapter.

### `createAuthWit` uses `call` (not `action`), and needs `getFunctionCall()`

The second parameter of `wallet.createAuthWit()` accepts `CallIntent`, which has a `call` field (not `action`). The `call` field expects a `FunctionCall`, not a `ContractFunctionInteraction`:

```typescript
// WRONG — 'action' doesn't exist on CallIntent
await wallet.createAuthWit(account, { caller: bridgeAddr, action: token.methods.burn_public(...) });

// CORRECT — use 'call' with getFunctionCall()
const functionCall = await token.methods.burn_public(user, amount, nonce).getFunctionCall();
await wallet.createAuthWit(account, { caller: bridgeAddr, call: functionCall });
```

### `.send()` returns `Promise<TxReceipt>` directly — no `.wait()`

In the current wallet-sdk, `.send()` already waits for the receipt by default:

```typescript
// WRONG — .wait() doesn't exist on Promise<TxReceipt>
const receipt = await contract.methods.foo(...args).send({ from: account }).wait();

// CORRECT
const receipt = await contract.methods.foo(...args).send({ from: account });
console.log(receipt.txHash, receipt.blockNumber);
```

### Import paths: `@aztec/aztec.js/contracts` (plural)

`Contract` and `BatchCall` are exported from `@aztec/aztec.js/contracts` (plural), not `@aztec/aztec.js/contract`:

```typescript
// WRONG
import { Contract } from '@aztec/aztec.js/contract';

// CORRECT
import { Contract } from '@aztec/aztec.js/contracts';
```

### `AztecAddress.toString()` on Aliased objects returns `[object Object]`

`wallet.getAccounts()` returns `Aliased<AztecAddress>[]`. Calling `.toString()` on the `Aliased` wrapper gives `[object Object]`. You must unwrap first:

```typescript
const accounts = await wallet.getAccounts();
const rawAccount: any = accounts[0];
// Unwrap the Aliased wrapper — try .item first (most common), then .address, then raw
const aztecAddr = rawAccount?.item ?? rawAccount?.address ?? rawAccount;
// Now safe to convert to string
const addressStr = typeof aztecAddr === 'string'
  ? aztecAddr
  : typeof aztecAddr?.toString === 'function'
    ? aztecAddr.toString()
    : String(aztecAddr);
```

### Defer wallet discovery to user action, not page load

Don't auto-discover wallets on page load — it shows unexpected UI (discovery modals, emoji verification) before the user intends to connect. Store the login method preference in localStorage, but only start `discoverWallets()` when the user explicitly clicks "Connect L2 Wallet".

### Token contract: `balance_of_public` is in `nonDispatchPublicFunctions`

In Aztec devnet 4, public functions like `balance_of_public` are dispatched through a single `public_dispatch` entry point. They appear in `artifact.nonDispatchPublicFunctions`, not in `artifact.functions`. However, `Contract.at()` correctly merges both into `.methods`, so `contract.methods.balance_of_public(owner).simulate()` works.

---

## Troubleshooting

### No wallets discovered
- Ensure the wallet extension is installed and enabled
- Check that the wallet supports the chain ID and version you're using
- Increase the discovery timeout (default 60s)
- Verify `extensions.enabled: true` in WalletManager config

### "Key exchange timeout" during connection
- You're likely calling `establishSecureChannel()` too long after discovery
- Connect immediately when a wallet is discovered (see discovery timing gotcha above)
- The provider's internal state expires if you wait for the full discovery timeout

### Emoji verification fails (emojis don't match)
- This indicates a potential MITM attack - DO NOT proceed
- Cancel the connection and try again
- If persistent, check for malicious extensions or compromised page

### Wallet disconnects unexpectedly
- Tab closure, extension update, or network change can cause disconnects
- Always register `onDisconnect` handlers
- Implement reconnection UI that restarts discovery

### "Method not authorized" errors
- The capability manifest didn't include the required capability
- Or the wallet user denied the specific capability
- Re-request capabilities with the missing permission

### Transaction simulation failures / "Unknown contract" errors
- Contract must be registered with the wallet's PXE first — call `wallet.registerContract(instance, artifact)`
- Get the `ContractInstanceWithAddress` from the aztec node: `await aztecNode.getContract(address)`
- Wrong account address - ensure `from` matches a granted account
- Contract function arguments are incorrect

### `proc_exit` / Barretenberg WASM crash in browser
- Missing COOP/COEP headers — add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`
- See the COOP/COEP gotcha above for details

---

## Important Types Quick Reference

```typescript
// From @aztec/wallet-sdk/manager
WalletManager           // Main entry point for dApps
WalletProvider          // A discovered wallet
PendingConnection       // Connection awaiting emoji verification
DiscoverySession        // Cancellable discovery session
WalletManagerConfig     // Manager configuration

// From @aztec/wallet-sdk/crypto
hashToEmoji(hash: string, count?: number): string

// From @aztec/wallet-sdk/extension/handlers
BackgroundConnectionHandler   // Wallet background script handler
ContentScriptConnectionHandler // Wallet content script relay
PendingDiscovery             // Pending connection request (wallet side)
ActiveSession                // Established encrypted session (wallet side)

// From @aztec/wallet-sdk/base-wallet
BaseWallet              // Abstract base class for wallet implementations

// From @aztec/aztec.js/wallet
Wallet                  // Connected wallet instance
AppCapabilities         // Permission request manifest
WalletCapabilities      // Permission response
Capability              // Union of all capability types
GrantedCapability       // Union of all granted capability types
GrantedAccountsCapability // Granted accounts with addresses
Aliased<T>             // T with optional .alias string

// From @aztec/aztec.js/account
ChainInfo               // { chainId: Fr, version: Fr }
```
