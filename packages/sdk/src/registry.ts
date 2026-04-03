import type { IHTLCClient } from './types/htlc-client'
import { RegistrationError } from './errors'

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
    : Record<string, unknown>

type HTLCClientFactory = (config: any) => IHTLCClient

export class TrainSDK {
    private registry = new Map<string, HTLCClientFactory>()

    registerHTLCClient<N extends string>(
        chainNamespace: N,
        factory: (config: ConfigFor<N>) => IHTLCClient,
    ): void {
        this.registry.set(chainNamespace, factory)
    }

    createHTLCClient<N extends string>(
        chainNamespace: N,
        config: ConfigFor<N>,
    ): IHTLCClient {
        const factory = this.registry.get(chainNamespace)
        if (!factory) {
            throw new RegistrationError(
                `No HTLC client registered for chain namespace: ${chainNamespace}. ` +
                `Did you forget to call the corresponding register function (e.g. registerEvmSdk())?`
            )
        }
        return factory(config)
    }

    getRegisteredNamespaces(): string[] {
        return Array.from(this.registry.keys())
    }
}

// Default instance + backward-compat free functions
export const defaultTrainSDK = new TrainSDK()

export function registerHTLCClient<N extends string>(
    chainNamespace: N,
    factory: (config: ConfigFor<N>) => IHTLCClient,
): void {
    return defaultTrainSDK.registerHTLCClient(chainNamespace, factory)
}

export function createHTLCClient<N extends string>(
    chainNamespace: N,
    config: ConfigFor<N>,
): IHTLCClient {
    return defaultTrainSDK.createHTLCClient(chainNamespace, config)
}

export function getRegisteredNamespaces(): string[] {
    return defaultTrainSDK.getRegisteredNamespaces()
}
