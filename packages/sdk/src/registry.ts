import type { IHTLCClient, BaseHTLCClientConfig } from './types/htlc-client'

// --- HTLC Client Registry ---

/**
 * Open interface for chain-specific HTLC client configs.
 * Chain SDKs extend this via declaration merging:
 *
 *   declare module '@train-protocol/sdk' {
 *       interface HTLCClientConfigMap {
 *           eip155: EvmHTLCClientConfig
 *       }
 *   }
 */
export interface HTLCClientConfigMap {}

type ConfigFor<N extends string> = N extends keyof HTLCClientConfigMap
    ? HTLCClientConfigMap[N]
    : BaseHTLCClientConfig & Record<string, unknown>

type HTLCClientFactory = (config: any) => IHTLCClient

const registry = new Map<string, HTLCClientFactory>()

export function registerHTLCClient<N extends string>(
    chainNamespace: N,
    factory: (config: ConfigFor<N>) => IHTLCClient,
): void {
    registry.set(chainNamespace, factory)
}

export function createHTLCClient<N extends string>(
    chainNamespace: N,
    config: ConfigFor<N>,
): IHTLCClient {
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

/**
 * Open interface for chain-specific wallet sign configs.
 * Chain SDKs extend this via declaration merging.
 */
export interface WalletSignConfigMap {}

type WalletSignConfigFor<N extends string> = N extends keyof WalletSignConfigMap
    ? WalletSignConfigMap[N]
    : Record<string, unknown>

type WalletSignFactory = (config: any) => Promise<Buffer>

const walletSignRegistry = new Map<string, WalletSignFactory>()

export function registerWalletSign<N extends string>(
    providerName: N,
    factory: (config: WalletSignConfigFor<N>) => Promise<Buffer>,
): void {
    walletSignRegistry.set(providerName, factory)
}

export function deriveKeyFromWallet<N extends string>(
    providerName: N,
    config: WalletSignConfigFor<N>,
): Promise<Buffer> {
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
