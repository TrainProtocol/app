/**
 * Open interface for chain-specific wallet sign configs.
 * Chain SDKs extend this via declaration merging.
 */
export interface WalletSignConfigMap {}

type WalletSignConfigFor<N extends string> = N extends keyof WalletSignConfigMap
    ? WalletSignConfigMap[N]
    : Record<string, unknown>

type WalletSignFactory = (config: any) => Promise<Uint8Array>

export class TrainAuth {
    private walletSignRegistry = new Map<string, WalletSignFactory>()

    registerWalletSign<N extends string>(
        providerName: N,
        factory: (config: WalletSignConfigFor<N>) => Promise<Uint8Array>,
    ): void {
        this.walletSignRegistry.set(providerName, factory)
    }

    deriveKeyFromWallet<N extends string>(
        providerName: N,
        config: WalletSignConfigFor<N>,
    ): Promise<Uint8Array> {
        const factory = this.walletSignRegistry.get(providerName)
        if (!factory) {
            throw new Error(
                `No wallet sign registered for provider: ${providerName}. ` +
                `Did you forget to call the corresponding register function (e.g. registerEvmSdk())?`
            )
        }
        return factory(config)
    }

    getRegisteredWalletSignProviders(): string[] {
        return Array.from(this.walletSignRegistry.keys())
    }
}

// Default instance + backward-compat free functions
export const defaultTrainAuth = new TrainAuth()

export function registerWalletSign<N extends string>(
    providerName: N,
    factory: (config: WalletSignConfigFor<N>) => Promise<Uint8Array>,
): void {
    return defaultTrainAuth.registerWalletSign(providerName, factory)
}

export function deriveKeyFromWallet<N extends string>(
    providerName: N,
    config: WalletSignConfigFor<N>,
): Promise<Uint8Array> {
    return defaultTrainAuth.deriveKeyFromWallet(providerName, config)
}

export function getRegisteredWalletSignProviders(): string[] {
    return defaultTrainAuth.getRegisteredWalletSignProviders()
}
