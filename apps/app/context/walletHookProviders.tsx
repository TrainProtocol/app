import React, { createContext, useContext, useMemo } from "react";
import { WalletProvider } from "../Models/WalletProvider";
import { useSettingsState } from "./settings";
import IconButton from "../components/buttons/iconButton";
import { ChevronLeft } from "lucide-react";
import ConnectorsList from "../components/WalletModal/ConnectorsList";
import { useConnectModal } from "../components/WalletModal";
import useEVM from "../lib/wallets/evm/useEVM";
import useStarknet from "../lib/wallets/starknet/useStarknet";
import useTON from "../lib/wallets/ton/useTON";
import useSVM from "../lib/wallets/solana/useSVM";
import VaulDrawer from "../components/Modal/vaulModal";
import useAztec from "../lib/wallets/aztec/useAztec";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import { isMobile } from "@/lib/wallets/utils/isMobile";
import useFuel from "@/lib/wallets/fuel/useFuel";

const WalletProvidersContext = createContext<WalletProvider[]>([]);

export const WalletProvidersProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { networks } = useSettingsState();
    const isMobilePlatform = isMobile();
    const { isMobile: isMobileSize } = useWindowDimensions()
    const { goBack, onFinish, open, setOpen, selectedConnector, selectedMultiChainConnector } = useConnectModal()

    const evm = useEVM();
    const starknet = useStarknet();
    const svm = useSVM();
    const ton = useTON();
    const aztec = useAztec()
    const fuel = useFuel();

    const providers = useMemo(() => {
        const allProviders: WalletProvider[] = [
            evm, starknet, svm, ton, aztec, fuel
        ];
        const filteredProviders = allProviders.filter(provider => isMobilePlatform ? !provider.unsupportedPlatforms?.includes('mobile') : !provider.unsupportedPlatforms?.includes('desktop'));

        return filteredProviders
        .filter(provider =>
            networks.some(net =>
                provider.autofillSupportedNetworks?.includes(net.caip2Id) ||
                provider.withdrawalSupportedNetworks?.includes(net.caip2Id) ||
                provider.asSourceSupportedNetworks?.includes(net.caip2Id)
            )
        );
    }, [networks, evm, starknet, svm, ton, aztec, fuel, isMobilePlatform]);

    return (
        <WalletProvidersContext.Provider value={providers}>
            {children}
            <VaulDrawer
                show={open}
                setShow={setOpen}
                onClose={onFinish}
                modalId={"connectNewWallet"}
                header={
                    <div className="flex items-center gap-1">
                        {
                            (selectedConnector || selectedMultiChainConnector) &&
                            <div className="sm:-ml-2 ml-0">
                                <IconButton onClick={goBack} icon={
                                    <ChevronLeft className="h-6 w-6" />
                                }>
                                </IconButton>
                            </div>
                        }
                        <p>{(selectedMultiChainConnector && !selectedConnector) ? "Select ecosystem" : "Connect wallet"}</p>
                    </div>
                }>
                <VaulDrawer.Snap openFullHeight={!isMobileSize} id='item-1' className="pb-4 sm:pb-0! sm:h-full">
                    <ConnectorsList onFinish={onFinish} />
                </VaulDrawer.Snap>
            </VaulDrawer>
        </WalletProvidersContext.Provider>
    );
};

export const useWalletProviders = () => useContext(WalletProvidersContext);