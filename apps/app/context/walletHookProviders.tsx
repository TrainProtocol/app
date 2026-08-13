import React, { createContext, useContext, useMemo } from "react";
import { WalletConnectionProvider } from "@layerswap/wallet-core/types";
import { useSettingsState } from "./settings";
// import useAztec from "@/lib/wallets/aztec/useAztec";
import { isMobile } from "@layerswap/utils";
import { useWalletProviderSnapshots } from "@layerswap/wallet-core";

const WalletProvidersContext = createContext<WalletConnectionProvider[]>([]);

export const WalletProvidersProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { networks } = useSettingsState();
    const isMobilePlatform = isMobile();

    const snapshots = useWalletProviderSnapshots();
    // const aztec = useAztec();

    const providers = useMemo(() => {
        const allProviders: WalletConnectionProvider[] = [
            ...snapshots,
            // aztec,
        ];

        return allProviders
            .filter(provider => isMobilePlatform ? !provider.unsupportedPlatforms?.includes('mobile') : !provider.unsupportedPlatforms?.includes('desktop'))
            .filter(provider => networks.some(network =>
                provider.autofillSupportedNetworks?.includes(network.caip2Id) ||
                provider.withdrawalSupportedNetworks?.includes(network.caip2Id) ||
                provider.asSourceSupportedNetworks?.includes(network.caip2Id)
            ));
    }, [networks, snapshots, isMobilePlatform]);

    return (
        <WalletProvidersContext.Provider value={providers}>
            {children}
        </WalletProvidersContext.Provider>
    );
};

export const useWalletProviders = () => useContext(WalletProvidersContext);
