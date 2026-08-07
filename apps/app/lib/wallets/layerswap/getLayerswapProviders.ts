import type { Config } from "wagmi";
import { createEVMProvider } from "@layerswap/wallet-evm";
import type { WalletProvider, WalletProviderDescriptor, WalletWrapper } from "@layerswap/ui-kit/types";
import { NetworkTypes, type ExtendedNetwork } from "@/Models/Network";
import AppSettings from "@/lib/AppSettings";

// This is a public, client-side-only project ID for WalletConnect wallet discovery.
// It has no authentication or authorization capability and is safe to expose in bundles.
export const WALLET_CONNECT_CONFIGS = {
    projectId: AppSettings.WalletConnectProjectId,
    name: 'Train Protocol',
    description: 'Train Protocol App',
    url: 'https://train.tech/',
    icons: ['https://app.train.tech/symbol.png'],
};

type Provider = WalletProvider<ExtendedNetwork> | WalletProviderDescriptor<ExtendedNetwork> | WalletWrapper;

export type DefaultWalletConfig = {
    networks: ExtendedNetwork[];
    wagmiConfig: Config;
    walletConnect?: typeof WALLET_CONNECT_CONFIGS;
};

function hasStorageKey(key: string) {
    try {
        return typeof window !== "undefined" && window.localStorage.getItem(key) !== null;
    } catch {
        return false;
    }
}

function readStorageJson(key: string): unknown {
    try {
        const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : undefined;
    } catch {
        return undefined;
    }
}

export function getLayerswapProviders(config: DefaultWalletConfig) {
    const { networks, wagmiConfig, walletConnect: walletConnectConfigs = WALLET_CONNECT_CONFIGS } = config;

    const networkIdsOfType = (matches: (network: ExtendedNetwork) => boolean) => networks.filter(matches).map(network => network.caip2Id);
    const FUEL_NETWORKS = networkIdsOfType(network => network.networkType.toLowerCase() === "fuel");
    const SVM_NETWORKS = networkIdsOfType(network => network.networkType === NetworkTypes.Solana);
    const STARKNET_NETWORKS = networkIdsOfType(network => network.networkType === NetworkTypes.Starknet);
    const TRON_NETWORKS = networkIdsOfType(network => network.networkType.toLowerCase() === "tron");

    return [
        createEVMProvider<ExtendedNetwork>({
            walletConnectConfigs,
            wagmiConfig,
            ethereumChainIds: [1, 11155111],
        }),
        {
            id: "fuel",
            name: "Fuel",
            autofillSupportedNetworks: FUEL_NETWORKS,
            withdrawalSupportedNetworks: FUEL_NETWORKS,
            asSourceSupportedNetworks: FUEL_NETWORKS,
            hasPersistedSession: () => hasStorageKey("fuel-current-connector"),
            loadProvider: async () => (await import("@layerswap/wallet-fuel")).createFuelProvider<ExtendedNetwork>(),
        },
        {
            id: "solana",
            name: "Solana",
            autofillSupportedNetworks: SVM_NETWORKS,
            withdrawalSupportedNetworks: SVM_NETWORKS,
            asSourceSupportedNetworks: SVM_NETWORKS,
            hasPersistedSession: () => hasStorageKey("walletAdapterPreviouslySelectedName"),
            loadProvider: async () => (await import("@layerswap/wallet-svm")).createSVMProvider<ExtendedNetwork>({ walletConnectConfigs }),
        },
        {
            id: "starknet",
            name: "Starknet",
            autofillSupportedNetworks: STARKNET_NETWORKS,
            withdrawalSupportedNetworks: STARKNET_NETWORKS,
            asSourceSupportedNetworks: STARKNET_NETWORKS,
            hasPersistedSession: () => {
                const state = readStorageJson("ls-starknet-accounts") as { state?: { activeWalletAddress?: string; starknetAccounts?: Record<string, string> } } | undefined;
                return !!state?.state?.activeWalletAddress || Object.keys(state?.state?.starknetAccounts ?? {}).length > 0;
            },
            loadProvider: async () => (await import("@layerswap/wallet-starknet")).createStarknetProvider<ExtendedNetwork>(),
        },
        {
            id: "tron",
            name: "Tron",
            autofillSupportedNetworks: TRON_NETWORKS,
            withdrawalSupportedNetworks: TRON_NETWORKS,
            asSourceSupportedNetworks: TRON_NETWORKS,
            hasPersistedSession: () => typeof readStorageJson("tronAdapterName") === "string",
            loadProvider: async () => (await import("@layerswap/wallet-tron")).createTronProvider<ExtendedNetwork>(),
        },
    ] satisfies Provider[];
}
