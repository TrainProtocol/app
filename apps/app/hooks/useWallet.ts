import { Network } from "../Models/Network"
import type { Wallet } from "@layerswap/widget-types";
import { WalletConnectionProvider } from "@layerswap/ui-kit/types";
import { useCallback, useMemo } from "react";
import { useWalletProviders } from "../context/walletHookProviders";

export type WalletPurpose = "autofill" | "withdrawal" | "asSource"

export default function useWallet(network?: Network | undefined | null, purpose?: WalletPurpose) {
    const walletProviders = useWalletProviders()

    const provider = useMemo(() => network ? resolveProvider(network, walletProviders, purpose) : undefined, [network, purpose, walletProviders])

    const wallets = useMemo(() => {
        let connectedWallets: Wallet[] = [];
        walletProviders.forEach((provider) => {

            const w = provider.connectedWallets?.map(wallet => {
                return resolveWallet(wallet, network, provider, purpose)
            });
            connectedWallets = w ? [...connectedWallets, ...w] : [...connectedWallets];
        });
        return connectedWallets;
    }, [walletProviders, network, purpose]);

    const unAvailableWallets = useMemo(() => {
        return wallets.filter(wallet => wallet.isNotAvailable)
    }, [wallets])

    const availableWallets = useMemo(() => {
        return wallets.filter(wallet => !wallet.isNotAvailable)
    }, [wallets])

    const getProvider = useCallback((network: Network, purpose: WalletPurpose) => {
        return network && resolveProvider(network, walletProviders, purpose)
    }, [walletProviders]);

    const res = useMemo(() => ({
        wallets: availableWallets,
        unAvailableWallets,
        provider,
        providers: walletProviders,
        getProvider
    }), [availableWallets, unAvailableWallets, provider, walletProviders, getProvider])

    return res
}

const resolvedProviderCache = new WeakMap<WalletConnectionProvider, Map<string, WalletConnectionProvider>>()

const resolveProvider = (network: Network | undefined, walletProviders: WalletConnectionProvider[], purpose?: WalletPurpose) => {
    if (!purpose || !network?.caip2Id) return

    let provider: WalletConnectionProvider | undefined = undefined
    switch (purpose) {
        case "withdrawal":
            provider = walletProviders.find(provider => provider.withdrawalSupportedNetworks?.includes(network.caip2Id))
            break;
        case "autofill":
            provider = walletProviders.find(provider => provider.autofillSupportedNetworks?.includes(network.caip2Id))
            break;
        case "asSource":
            provider = walletProviders.find(provider => provider.asSourceSupportedNetworks?.includes(network.caip2Id))
            break;
    }

    if (provider?.isNotAvailableCondition && purpose) {
        const cacheKey = `${network.caip2Id}|${purpose}`
        const cachedByKey = resolvedProviderCache.get(provider)
        const cached = cachedByKey?.get(cacheKey)
        if (cached) return cached

        const availableConnectors = provider.availableConnectors?.filter(connector => (provider.isNotAvailableCondition && network?.caip2Id) ? !provider.isNotAvailableCondition(connector.id, network?.caip2Id, purpose) : true)
        const additionalConnectors = provider.additionalConnectors?.filter(connector => (provider.isNotAvailableCondition && network?.caip2Id) ? !provider.isNotAvailableCondition(connector.id, network?.caip2Id, purpose) : true)
        const requestAdditionalConnectors = provider.requestAdditionalConnectors
            ? async (params) => {
                const result = await provider.requestAdditionalConnectors?.(params)
                if (!result) {
                    return { connectors: [], nextPage: null, totalCount: 0 }
                }

                return {
                    ...result,
                    connectors: result.connectors.filter(connector => (provider.isNotAvailableCondition && network?.caip2Id) ? !provider.isNotAvailableCondition(connector.id, network?.caip2Id, purpose) : true)
                }
            }
            : undefined
        const resolvedProvider = {
            ...provider,
            connectedWallets: provider.connectedWallets?.map(wallet => {
                const connectorId = wallet.internalId ?? wallet.id
                return {
                    ...wallet,
                    isNotAvailable: (provider.isNotAvailableCondition && network?.caip2Id && connectorId) ? provider.isNotAvailableCondition(connectorId, network?.caip2Id, purpose) : false,
                }
            }),
            activeWallet: provider.activeWallet ? {
                ...provider.activeWallet,
                isNotAvailable: (network?.caip2Id) ? provider.isNotAvailableCondition(provider.activeWallet.internalId ?? provider.activeWallet.id, network?.caip2Id, purpose) : false,
            } : undefined,
            availableConnectors: availableConnectors,
            additionalConnectors,
            requestAdditionalConnectors,
        }
        const byKey = cachedByKey ?? new Map<string, WalletConnectionProvider>()
        byKey.set(cacheKey, resolvedProvider)
        if (!cachedByKey) resolvedProviderCache.set(provider, byKey)
        return resolvedProvider
    }

    return provider
}

const resolveWallet = (wallet: Wallet, network: Network | undefined | null, provider: WalletConnectionProvider, purpose?: WalletPurpose) => {

    if (provider.isNotAvailableCondition && network?.caip2Id && wallet.internalId && !purpose) {
        return {
            ...wallet,
            isNotAvailable: provider.isNotAvailableCondition(wallet.internalId, network?.caip2Id),
        }
    }

    if (purpose === "autofill") {
        return {
            ...wallet,
            isNotAvailable: !supportsNetwork(wallet.autofillSupportedNetworks, network),
        }
    } else if (purpose === "withdrawal") {
        return {
            ...wallet,
            isNotAvailable: !supportsNetwork(wallet.withdrawalSupportedNetworks, network),
        }
    } else if (purpose === "asSource") {
        return {
            ...wallet,
            isNotAvailable: !supportsNetwork(wallet.asSourceSupportedNetworks, network),
        }
    }

    return {
        ...wallet,
        isNotAvailable: false,
    }
}

const supportsNetwork = (
    supportedNetworks: string[] | undefined,
    network: Network | undefined | null,
): boolean => {
    const caip2Id = network?.caip2Id
    if (!caip2Id) return false

    const normalizedCaip2Id = caip2Id.toLowerCase()
    return supportedNetworks?.some(candidate =>
        typeof candidate === "string" &&
        candidate.toLowerCase() === normalizedCaip2Id
    ) ?? false
}
