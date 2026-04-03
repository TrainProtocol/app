import type { IHTLCReadClient, IHTLCClient, TrainSDK } from '@train-protocol/sdk'
import type { Caip2Id, ChainNamespace } from '../internal/branded'

/** Minimal signer abstraction for chain-agnostic transaction sending */
export interface TrainSigner {
    address: string
    chainNamespace: string // 'eip155', 'solana', 'starknet', 'aztec'
    sendTransaction: (tx: { to: string; data: string; value?: bigint }) => Promise<string>
}

/**
 * Wallet adapter interface — consumers implement this to bridge their wallet library.
 *
 * The adapter is responsible for creating HTLC clients with the correct
 * chain-specific config. This keeps type safety at the adapter level where
 * the chain knowledge lives, instead of leaking untyped config through hooks.
 */
export interface TrainWalletAdapter {
    chainNamespace: ChainNamespace

    /** Create a read-only HTLC client for monitoring/polling (no signer) */
    createClient(sdk: TrainSDK, networkId: Caip2Id): IHTLCReadClient

    /** Create a write HTLC client with signer for transactions.
     *  @param address - When provided, use this specific account as signer
     *  (e.g. the user-selected account). When omitted, fall back to the
     *  framework's active/default account. */
    createWriteClient(sdk: TrainSDK, networkId: Caip2Id, address?: string): IHTLCClient

    /** Return config for wallet-based secret derivation. Null = wallet not ready.
     *  @param address - When provided, resolve config for this specific account. */
    getLoginConfig?: (address?: string) => Record<string, unknown> | null | Promise<Record<string, unknown> | null>
}
