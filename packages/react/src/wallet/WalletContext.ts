import { createContext, useContext } from 'react'
import type { IHTLCReadClient, IHTLCClient, TrainSDK } from '@train-protocol/sdk'
import type { TrainWalletAdapter } from './types'
import type { Caip2Id, ChainNamespace } from '../internal/branded'

export interface WalletContextValue {
    registerAdapter: (adapter: TrainWalletAdapter) => () => void
    /** Create a read-only HTLC client for the given network (delegates to adapter) */
    createClient: (networkId: Caip2Id) => IHTLCReadClient
    /** Create a write HTLC client with signer for the given network (delegates to adapter).
     *  @param address - When provided, use this specific account as signer. */
    createWriteClient: (networkId: Caip2Id, address?: string) => IHTLCClient
    /** Get login config for wallet-based secret derivation.
     *  @param address - When provided, resolve config for this specific account. */
    getLoginConfig: (chainNamespace: ChainNamespace, address?: string) => Record<string, unknown> | null | Promise<Record<string, unknown> | null>
}

export const WalletContext = createContext<WalletContextValue | null>(null)

export function useWalletContext(): WalletContextValue {
    const ctx = useContext(WalletContext)
    if (!ctx) {
        throw new Error('useWalletContext must be used within a <TrainProvider>')
    }
    return ctx
}

/** Non-throwing version — returns null when used outside TrainProvider */
export function useWalletContextOptional(): WalletContextValue | null {
    return useContext(WalletContext)
}
