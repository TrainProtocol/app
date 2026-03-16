Explain the Train Protocol packages architecture to help agents understand the codebase.

Read and summarize the following README files to understand what each package does:
- packages/sdk/README.md — @train-protocol/sdk (core HTLC logic, API client, verification, key derivation)
- packages/react/README.md — @train-protocol/react (React hooks, providers, swap state management)
- packages/blockchains/evm/README.md — @train-protocol/evm (EVM HTLC client)

Also check for READMEs in other blockchain packages:
- packages/blockchains/solana/
- packages/blockchains/starknet/
- packages/blockchains/aztec/

After reading, provide a concise summary of:
1. What each package does and its key exports
2. How the packages relate to each other (dependency graph)
3. The plugin registration pattern (how chain-specific packages plug into the SDK)
4. The provider hierarchy in @train-protocol/react
5. The HTLC swap flow across packages
