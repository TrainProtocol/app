import type { IHTLCPublicClient, IHTLCWalletClient, TransactionRequestFor } from './types/htlc-client'
import { RegistrationError } from './errors'

// --- HTLC Client Registry ---

/**
 * Open interface for chain-specific HTLC public client configs.
 * Chain SDKs extend this via declaration merging:
 *
 *   declare module '@train-protocol/sdk' {
 *       interface HTLCPublicClientConfigMap {
 *           eip155: EvmHTLCPublicClientConfig
 *       }
 *   }
 */
export interface HTLCPublicClientConfigMap {}

/**
 * Open interface for chain-specific HTLC wallet client configs.
 * Chain SDKs extend this via declaration merging:
 *
 *   declare module '@train-protocol/sdk' {
 *       interface HTLCWalletClientConfigMap {
 *           eip155: EvmHTLCWalletClientConfig
 *       }
 *   }
 */
export interface HTLCWalletClientConfigMap {}

type PublicConfigFor<N extends string> = N extends keyof HTLCPublicClientConfigMap
    ? HTLCPublicClientConfigMap[N]
    : Record<string, unknown>

type WalletConfigFor<N extends string> = N extends keyof HTLCWalletClientConfigMap
    ? HTLCWalletClientConfigMap[N]
    : Record<string, unknown>

type HTLCPublicClientFactory = (config: any) => IHTLCPublicClient
type HTLCWalletClientFactory = (config: any) => IHTLCWalletClient

export class TrainSDK {
    private publicRegistry = new Map<string, HTLCPublicClientFactory>()
    private walletRegistry = new Map<string, HTLCWalletClientFactory>()

    registerHTLCPublicClient<N extends string>(
        chainNamespace: N,
        factory: (config: PublicConfigFor<N>) => IHTLCPublicClient,
    ): void {
        this.publicRegistry.set(chainNamespace, factory)
    }

    registerHTLCWalletClient<N extends string>(
        chainNamespace: N,
        factory: (config: WalletConfigFor<N>) => IHTLCWalletClient<TransactionRequestFor<N>>,
    ): void {
        this.walletRegistry.set(chainNamespace, factory)
    }

    createHTLCPublicClient<N extends string>(
        chainNamespace: N,
        config: PublicConfigFor<N>,
    ): IHTLCPublicClient {
        const factory = this.publicRegistry.get(chainNamespace)
        if (!factory) {
            throw new RegistrationError(
                `No HTLC public client registered for chain namespace: ${chainNamespace}. ` +
                `Did you forget to call the corresponding register function (e.g. registerEvmSdk())?`
            )
        }
        return factory(config)
    }

    createHTLCWalletClient<N extends string>(
        chainNamespace: N,
        config: WalletConfigFor<N>,
    ): IHTLCWalletClient<TransactionRequestFor<N>> {
        const factory = this.walletRegistry.get(chainNamespace)
        if (!factory) {
            throw new RegistrationError(
                `No HTLC wallet client registered for chain namespace: ${chainNamespace}. ` +
                `Did you forget to call the corresponding register function (e.g. registerEvmSdk())?`
            )
        }
        return factory(config) as IHTLCWalletClient<TransactionRequestFor<N>>
    }

    getRegisteredNamespaces(): string[] {
        return Array.from(new Set([
            ...this.publicRegistry.keys(),
            ...this.walletRegistry.keys(),
        ]))
    }
}

// Default instance + free functions
export const defaultTrainSDK = new TrainSDK()

export function registerHTLCPublicClient<N extends string>(
    chainNamespace: N,
    factory: (config: PublicConfigFor<N>) => IHTLCPublicClient,
): void {
    return defaultTrainSDK.registerHTLCPublicClient(chainNamespace, factory)
}

export function registerHTLCWalletClient<N extends string>(
    chainNamespace: N,
    factory: (config: WalletConfigFor<N>) => IHTLCWalletClient<TransactionRequestFor<N>>,
): void {
    return defaultTrainSDK.registerHTLCWalletClient(chainNamespace, factory)
}

export function createHTLCPublicClient<N extends string>(
    chainNamespace: N,
    config: PublicConfigFor<N>,
): IHTLCPublicClient {
    return defaultTrainSDK.createHTLCPublicClient(chainNamespace, config)
}

export function createHTLCWalletClient<N extends string>(
    chainNamespace: N,
    config: WalletConfigFor<N>,
): IHTLCWalletClient<TransactionRequestFor<N>> {
    return defaultTrainSDK.createHTLCWalletClient(chainNamespace, config)
}

export function getRegisteredNamespaces(): string[] {
    return defaultTrainSDK.getRegisteredNamespaces()
}
