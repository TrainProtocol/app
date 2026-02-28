import type { IHTLCClient } from './types/htlc-client'

export type HTLCClientFactory = (config: Record<string, unknown>) => IHTLCClient

const registry = new Map<string, HTLCClientFactory>()

export function registerHTLCClient(chainNamespace: string, factory: HTLCClientFactory): void {
    registry.set(chainNamespace, factory)
}

export function createHTLCClient(chainNamespace: string, config: Record<string, unknown>): IHTLCClient {
    const factory = registry.get(chainNamespace)
    if (!factory) {
        throw new Error(
            `No HTLC client registered for chain namespace: ${chainNamespace}. ` +
            `Did you forget to call the corresponding register function (e.g. registerEvmSdk())?`
        )
    }
    return factory(config)
}

export function getRegisteredNamespaces(): string[] {
    return Array.from(registry.keys())
}

// --- Wallet Sign Registry ---

export type WalletSignFactory = (config: Record<string, unknown>) => Promise<Buffer>

const walletSignRegistry = new Map<string, WalletSignFactory>()

export function registerWalletSign(providerName: string, factory: WalletSignFactory): void {
    walletSignRegistry.set(providerName, factory)
}

export function deriveKeyFromWallet(providerName: string, config: Record<string, unknown>): Promise<Buffer> {
    const factory = walletSignRegistry.get(providerName)
    if (!factory) {
        throw new Error(
            `No wallet sign registered for provider: ${providerName}. ` +
            `Did you forget to call the corresponding register function (e.g. registerEvmSdk())?`
        )
    }
    return factory(config)
}

export function getRegisteredWalletSignProviders(): string[] {
    return Array.from(walletSignRegistry.keys())
}
