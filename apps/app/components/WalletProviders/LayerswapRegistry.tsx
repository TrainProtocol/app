"use client";

import { type FC, type ReactNode, useMemo } from "react";
import { useConfig } from "wagmi";
import { DescriptorHydrationBoundary, WalletProvidersRegistryProvider } from "@layerswap/wallet-core";
import { type WalletProvider, type WalletProviderDescriptor, type WalletWrapper } from "@layerswap/wallet-core/types";
import { AppSettings as LayerswapAppSettings } from "@layerswap/utils";
import { useSettingsState } from "@/context/settings";
import { walletNetworkAdapter } from "@/lib/wallets/layerswap/networkAdapter";
import { getLayerswapProviders } from "@/lib/wallets/layerswap/getLayerswapProviders";

type Provider = WalletProvider | WalletProviderDescriptor | WalletWrapper;

const Registry = WalletProvidersRegistryProvider as FC<{
    networks: ReturnType<typeof useSettingsState>["networks"];
    networkAdapter: typeof walletNetworkAdapter;
    walletProviders: Provider[];
    children?: ReactNode;
}>;

const LayerswapRegistry: FC<{ children: ReactNode }> = ({ children }) => {
    const { networks } = useSettingsState();
    const wagmiConfig = useConfig();
    const walletProviders = useMemo(() => getLayerswapProviders({ networks, wagmiConfig }), [networks, wagmiConfig]);

    if (typeof window !== "undefined") {
        LayerswapAppSettings.ApiVersion = process.env.NEXT_PUBLIC_API_VERSION === "sandbox" ? "testnet" : "mainnet";
    }

    return (
        <DescriptorHydrationBoundary walletProviders={walletProviders}>
            {resolvedProviders => <Registry networks={networks} networkAdapter={walletNetworkAdapter} walletProviders={resolvedProviders as Provider[]}>{children}</Registry>}
        </DescriptorHydrationBoundary>
    );
};

export default LayerswapRegistry;
